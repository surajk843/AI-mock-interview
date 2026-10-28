/* eslint-disable @typescript-eslint/no-unused-vars */

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
import { useEffect, useState } from "react";
import useSpeechToText, { ResultType } from "react-hook-speech-to-text";
import { useParams } from "react-router-dom";
import WebCam from "react-webcam";
import { TooltipButton } from "./tooltip-button";
import { toast } from "sonner";
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

const API_URL = "https://ai-mock-interview-api-vrzo.onrender.com";

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

  const [userAnswer, setUserAnswer] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { userId, getToken } = useAuth();
  const { interviewId } = useParams();

  // Evaluate the answer through the backend.
  const generateResult = async (
    qst: string,
    qstAns: string,
    userAns: string
  ): Promise<AIResponse | null> => {
    setIsAiGenerating(true);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch(
        `${API_URL}/api/gemini/evaluate-answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: qst,
            correctAnswer: qstAns,
            userAnswer: userAns,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to evaluate your answer."
        );
      }

      const evaluation = result.evaluation;

      if (
        typeof evaluation?.ratings !== "number" ||
        typeof evaluation?.feedback !== "string"
      ) {
        throw new Error("The backend returned an invalid evaluation.");
      }

      return evaluation as AIResponse;
    } catch (error) {
      console.error("Answer evaluation error:", error);

      toast.error("Unable to generate feedback", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
      });

      return null;
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Start or stop speech recognition and evaluate the answer.
  const recordUserAnswer = async () => {
    if (!isRecording) {
      setUserAnswer("");
      setAiResult(null);
      startSpeechToText();
      return;
    }

    stopSpeechToText();

    if (userAnswer.trim().length < 30) {
      toast.error("Answer too short", {
        description: "Your answer should be more than 30 characters.",
      });
      return;
    }

    const result = await generateResult(
      question.question,
      question.answer,
      userAnswer
    );

    if (result) {
      setAiResult(result);
    }
  };

  // Reset and start a new recording.
  const recordNewAnswer = () => {
    setUserAnswer("");
    setAiResult(null);
    stopSpeechToText();
    startSpeechToText();
  };

  // Save the evaluated answer through the backend.
  const saveUserAnswer = async () => {
    if (!aiResult) {
      toast.error("Evaluate your answer before saving.");
      return;
    }

    if (!userId || !interviewId) {
      toast.error("Unable to save answer", {
        description: "Your user or interview information is missing.",
      });
      return;
    }

    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        throw new Error("Please sign in again.");
      }

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
          user_ans: userAnswer,
          feedback: aiResult.feedback,
          rating: aiResult.ratings,
        }),
      });

      const result = await response.json();

      if (response.status === 409) {
        toast.info("Already answered", {
          description: "You have already saved an answer to this question.",
        });
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || "Failed to save your answer.");
      }

      toast.success("Answer saved successfully.");

      setUserAnswer("");
      setAiResult(null);
      stopSpeechToText();
      setOpen(false);
    } catch (error) {
      console.error("Save answer error:", error);

      toast.error("Unable to save answer", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Combine speech recognition results.
  useEffect(() => {
    const combineTranscripts = results
      .filter(
        (result): result is ResultType => typeof result !== "string"
      )
      .map((result) => result.transcript)
      .join(" ");

    setUserAnswer(combineTranscripts);
  }, [results]);

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
            onUserMedia={() => setIsWebCam(true)}
            onUserMediaError={() => setIsWebCam(false)}
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
        />

        <TooltipButton
          content={isRecording ? "Stop Recording" : "Start Recording"}
          icon={
            isRecording ? (
              <CircleStop className="min-w-5 min-h-5" />
            ) : (
              <Mic className="min-w-5 min-h-5" />
            )
          }
          onClick={recordUserAnswer}
          disabled={isAiGenerating || loading}
        />

        <TooltipButton
          content="Record Again"
          icon={<RefreshCw className="min-w-5 min-h-5" />}
          onClick={recordNewAnswer}
          disabled={isAiGenerating || loading}
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

        <p className="text-sm mt-2 text-gray-700 whitespace-normal">
          {userAnswer || "Start recording to see your answer here"}
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