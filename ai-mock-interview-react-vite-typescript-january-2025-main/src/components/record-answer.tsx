import { useAuth } from "@clerk/clerk-react";
import {
  CircleStop,
  Loader,
  Mic,
  RefreshCw,
  Save,
  Video,
  VideoOff,
  WebcamIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import useSpeechToText, { ResultType } from "react-hook-speech-to-text";
import { useParams } from "react-router-dom";
import WebCam from "react-webcam";
import { toast } from "sonner";

import { TooltipButton } from "./tooltip-button";
import { SaveModal } from "./save-modal";

interface RecordAnswerProps {
  question: {
    question: string;
    answer: string;
  };
  isWebCam: boolean;
  setIsWebCam: (value: boolean) => void;
}

interface AIResponse {
  ratings: number;
  feedback: string;
}

const API_URL = "http://localhost:5000";

export const RecordAnswer = ({
  question,
  isWebCam,
  setIsWebCam,
}: RecordAnswerProps) => {
  const {
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
  });

  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { interviewId } = useParams<{ interviewId: string }>();

  const [userAnswer, setUserAnswer] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isStartingRecording, setIsStartingRecording] = useState(false);

  // Keep the latest answer available to asynchronous functions.
  const userAnswerRef = useRef("");
  const isRecordingRef = useRef(false);
  const isStartingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isMountedRef = useRef(true);

  const startSpeechToTextRef = useRef(startSpeechToText);
  const stopSpeechToTextRef = useRef(stopSpeechToText);

  // Keep the latest speech-recognition functions without triggering
  // unnecessary effect cleanup or restarting recognition.
  useEffect(() => {
    startSpeechToTextRef.current = startSpeechToText;
    stopSpeechToTextRef.current = stopSpeechToText;
  }, [startSpeechToText, stopSpeechToText]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Track whether this component is mounted.
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      try {
        stopSpeechToTextRef.current();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    };
  }, []);

  const updateUserAnswer = useCallback((value: string) => {
    userAnswerRef.current = value;
    setUserAnswer(value);
  }, []);

  /**
   * Retrieve the authenticated Clerk token.
   */
  const getAuthToken = async (): Promise<string> => {
    if (!isLoaded || !isSignedIn) {
      throw new Error("Please sign in before continuing.");
    }

    const token = await getToken();

    if (!token) {
      throw new Error(
        "Unable to retrieve your authentication token. Please sign in again."
      );
    }

    return token;
  };

  /**
   * Start speech recognition safely.
   *
   * The ref prevents multiple rapid clicks from triggering multiple
   * simultaneous startup attempts.
   */
  const startRecording = useCallback(async () => {
    if (
      isStartingRef.current ||
      isRecordingRef.current ||
      isProcessingRef.current
    ) {
      return;
    }

    isStartingRef.current = true;

    if (isMountedRef.current) {
      setIsStartingRecording(true);
    }

    try {
      // Start directly from the user's click to preserve browser
      // microphone permission and user-activation behavior.
      await startSpeechToTextRef.current();

      // Do not assume recording started merely because the function
      // returned. The hook's isRecording state remains authoritative.
    } catch (error) {
      console.error("Speech recognition start error:", error);

      if (isMountedRef.current) {
        toast.error("Unable to start recording", {
          description:
            "Check your microphone permission and ensure your browser supports speech recognition. Then try again.",
        });
      }
    } finally {
      isStartingRef.current = false;

      if (isMountedRef.current) {
        setIsStartingRecording(false);
      }
    }
  }, []);

  /**
   * Evaluate the recorded answer using the backend Gemini endpoint.
   */
  const generateResult = async (
    questionText: string,
    correctAnswer: string,
    answerText: string
  ): Promise<AIResponse | null> => {
    setIsAiGenerating(true);

    try {
      const token = await getAuthToken();

      const response = await fetch(
        `${API_URL}/api/gemini/evaluate-answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: questionText,
            correctAnswer,
            userAnswer: answerText,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            "Failed to evaluate your answer."
        );
      }

      const evaluation = result.evaluation;

      if (
        typeof evaluation?.ratings !== "number" ||
        !Number.isFinite(evaluation.ratings) ||
        evaluation.ratings < 0 ||
        evaluation.ratings > 10 ||
        typeof evaluation.feedback !== "string" ||
        !evaluation.feedback.trim()
      ) {
        throw new Error("The backend returned an invalid evaluation.");
      }

      return {
        ratings: evaluation.ratings,
        feedback: evaluation.feedback,
      };
    } catch (error) {
      console.error("Answer evaluation error:", error);

      toast.error("Unable to generate feedback", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });

      return null;
    } finally {
      if (isMountedRef.current) {
        setIsAiGenerating(false);
      }
    }
  };

  /**
   * Start recording or stop recording and evaluate the answer.
   */
  const recordUserAnswer = async () => {
    if (
      isAiGenerating ||
      loading ||
      isStartingRef.current ||
      isProcessingRef.current
    ) {
      return;
    }

    // Start recording.
    if (!isRecordingRef.current) {
      updateUserAnswer("");
      setAiResult(null);

      await startRecording();
      return;
    }

    // Prevent duplicate processing while stopping or evaluating.
    isProcessingRef.current = true;

    try {
      // Capture the current transcript before stopping recognition.
      const answerText = userAnswerRef.current.trim();

      await Promise.resolve(stopSpeechToTextRef.current());

      isRecordingRef.current = false;

      if (answerText.length < 30) {
        toast.error("Answer too short", {
          description:
            "Please record an answer containing at least 30 characters.",
        });

        return;
      }

      const evaluation = await generateResult(
        question.question,
        question.answer,
        answerText
      );

      if (evaluation && isMountedRef.current) {
        setAiResult(evaluation);
      }
    } catch (error) {
      console.error("Error processing recorded answer:", error);

      toast.error("Unable to process your answer", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  /**
   * Clear the previous answer and begin recording again.
   */
  const recordNewAnswer = async () => {
    if (
      isAiGenerating ||
      loading ||
      isStartingRef.current ||
      isProcessingRef.current
    ) {
      return;
    }

    isProcessingRef.current = true;

    try {
      if (isRecordingRef.current) {
        await Promise.resolve(stopSpeechToTextRef.current());
        isRecordingRef.current = false;
      }

      updateUserAnswer("");
      setAiResult(null);
      setOpen(false);

      // Allow the previous recognition session to finish stopping
      // before creating a new session.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 150);
      });

      isProcessingRef.current = false;

      await startRecording();
    } catch (error) {
      console.error("Speech recognition restart error:", error);

      toast.error("Unable to restart recording", {
        description:
          "Check your browser's microphone permission and try again.",
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  /**
   * Save the evaluated answer through the authenticated backend.
   */
  const saveUserAnswer = async () => {
    if (!aiResult) {
      toast.error("Evaluate your answer before saving.");
      return;
    }

    if (!interviewId) {
      toast.error("Unable to save answer", {
        description: "The interview ID is missing.",
      });
      return;
    }

    const answerText = userAnswerRef.current.trim();

    if (!answerText) {
      toast.error("Unable to save answer", {
        description: "Your recorded answer is empty.",
      });
      return;
    }

    try {
      setLoading(true);

      // Ensure recording has stopped before saving.
      if (isRecordingRef.current) {
        await Promise.resolve(stopSpeechToTextRef.current());
        isRecordingRef.current = false;
      }

      const token = await getAuthToken();

      const response = await fetch(`${API_URL}/api/user-answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mockIdRef: interviewId,
          question: question.question,
          correct_ans: question.answer,
          user_ans: answerText,
          feedback: aiResult.feedback,
          rating: aiResult.ratings,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 409) {
        toast.info("Already answered", {
          description:
            "You have already saved an answer to this question.",
        });

        setOpen(false);
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            "Failed to save your answer."
        );
      }

      toast.success("Answer saved successfully.");

      updateUserAnswer("");
      setAiResult(null);
      setOpen(false);
    } catch (error) {
      console.error("Save answer error:", error);

      toast.error("Unable to save answer", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Synchronize the recognized transcript with the displayed answer.
   */
  useEffect(() => {
    const transcript = results
      .filter(
        (result): result is ResultType => typeof result !== "string"
      )
      .map((result) => result.transcript)
      .join(" ")
      .trim();

    if (transcript) {
      updateUserAnswer(transcript);
    }
  }, [results, updateUserAnswer]);

  return (
    <div className="w-full flex flex-col items-center gap-8 mt-4">
      <SaveModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={saveUserAnswer}
        loading={loading}
      />

      {/* Webcam */}
      <div className="w-full h-[400px] md:w-96 flex flex-col items-center justify-center border p-4 bg-gray-50 rounded-md">
        {isWebCam ? (
          <WebCam
            audio={false}
            onUserMedia={() => setIsWebCam(true)}
            onUserMediaError={() => {
              setIsWebCam(false);

              toast.error("Unable to access the webcam", {
                description:
                  "Check your browser's camera permission and try again.",
              });
            }}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <WebcamIcon className="min-w-24 min-h-24 text-muted-foreground" />
        )}
      </div>

      {/* Recording controls */}
      <div className="flex items-center justify-center gap-3">
        <TooltipButton
          content={isWebCam ? "Turn Off" : "Turn On"}
          icon={
            isWebCam ? (
              <VideoOff className="min-w-5 min-h-5" />
            ) : (
              <Video className="min-w-5 min-h-5" />
            )
          }
          onClick={() => setIsWebCam(!isWebCam)}
          disabled={loading || isAiGenerating}
        />

        <TooltipButton
          content={
            isStartingRecording
              ? "Starting microphone..."
              : isRecording
                ? "Stop Recording"
                : "Start Recording"
          }
          icon={
            isStartingRecording || isAiGenerating ? (
              <Loader className="min-w-5 min-h-5 animate-spin" />
            ) : isRecording ? (
              <CircleStop className="min-w-5 min-h-5" />
            ) : (
              <Mic className="min-w-5 min-h-5" />
            )
          }
          onClick={recordUserAnswer}
          disabled={
            isStartingRecording ||
            isAiGenerating ||
            loading ||
            isProcessingRef.current
          }
        />

        <TooltipButton
          content="Record Again"
          icon={<RefreshCw className="min-w-5 min-h-5" />}
          onClick={recordNewAnswer}
          disabled={
            isStartingRecording ||
            isAiGenerating ||
            loading ||
            isProcessingRef.current
          }
        />

        <TooltipButton
          content="Save Result"
          icon={
            isAiGenerating || loading ? (
              <Loader className="min-w-5 min-h-5 animate-spin" />
            ) : (
              <Save className="min-w-5 min-h-5" />
            )
          }
          onClick={() => setOpen(true)}
          disabled={!aiResult || isAiGenerating || loading}
          loading={loading}
        />
      </div>

      {/* Recognized answer */}
      <div className="w-full mt-4 p-4 border rounded-md bg-gray-50">
        <h2 className="text-lg font-semibold">Your Answer:</h2>

        <p className="text-sm mt-2 text-gray-700 whitespace-pre-wrap">
          {userAnswer || "Start recording to see your answer here."}
        </p>

        {interimResult && (
          <p className="text-sm text-gray-500 mt-2">
            <strong>Current Speech:</strong> {interimResult}
          </p>
        )}
      </div>

      {/* AI evaluation */}
      {aiResult && (
        <div className="w-full p-4 border rounded-md bg-white">
          <h2 className="text-lg font-semibold">AI Feedback</h2>

          <p className="text-sm mt-2">
            <strong>Rating:</strong> {aiResult.ratings}/10
          </p>

          <p className="text-sm mt-2 whitespace-pre-wrap">
            <strong>Feedback:</strong> {aiResult.feedback}
          </p>
        </div>
      )}
    </div>
  );
};