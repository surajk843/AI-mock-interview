import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TooltipButton } from "./tooltip-button";
import { Volume2, VolumeX, CheckCircle2 } from "lucide-react";
import { RecordAnswer } from "./record-answer";

interface QuestionSectionProps {
  questions: { question: string; answer: string }[];
}

export const QuestionSection = ({
  questions,
}: QuestionSectionProps) => {
  const navigate = useNavigate();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isWebCam, setIsWebCam] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState<string | null>(
    null
  );

  const [activeQuestion, setActiveQuestion] = useState("0");

  const handlePlayQuestion = (question: string) => {
    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support speech playback.");
      return;
    }

    if (isPlaying && currentQuestion === question) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentQuestion(null);
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(question);

    speech.onstart = () => {
      setIsPlaying(true);
      setCurrentQuestion(question);
    };

    speech.onend = () => {
      setIsPlaying(false);
      setCurrentQuestion(null);
    };

    speech.onerror = () => {
      setIsPlaying(false);
      setCurrentQuestion(null);
    };

    setCurrentQuestion(question);
    setIsPlaying(true);

    window.speechSynthesis.speak(speech);
  };

  const handleQuestionChange = (value: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsPlaying(false);
    setCurrentQuestion(null);
    setActiveQuestion(value);
  };

  const handleFinishInterview = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsPlaying(false);
    setCurrentQuestion(null);

    navigate("/generate");
  };

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!questions || questions.length === 0) {
    return (
      <div className="w-full min-h-40 border rounded-md p-4 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No interview questions are available.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-96 border rounded-md p-4">
      <Tabs
        value={activeQuestion}
        onValueChange={handleQuestionChange}
        className="w-full space-y-12"
        orientation="vertical"
      >
        {/* Question navigation */}

        <TabsList className="bg-transparent w-full flex flex-wrap items-center justify-start gap-4">
          {questions.map((tab, index) => (
            <TabsTrigger
              className={cn(
                "data-[state=active]:bg-emerald-200",
                "data-[state=active]:shadow-md",
                "text-xs px-2"
              )}
              key={`${index}-${tab.question}`}
              value={String(index)}
            >
              {`Question #${index + 1}`}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Question content */}

        {questions.map((tab, index) => (
          <TabsContent
            key={`${index}-${tab.question}`}
            value={String(index)}
          >
            {/* Question text */}

            <p className="text-base text-left tracking-wide text-neutral-500">
              {tab.question}
            </p>

            {/* Speech playback */}

            <div className="w-full flex items-center justify-end">
              <TooltipButton
                content={
                  isPlaying && currentQuestion === tab.question
                    ? "Stop"
                    : "Read question aloud"
                }
                icon={
                  isPlaying && currentQuestion === tab.question ? (
                    <VolumeX className="min-w-5 min-h-5 text-muted-foreground" />
                  ) : (
                    <Volume2 className="min-w-5 min-h-5 text-muted-foreground" />
                  )
                }
                onClick={() => handlePlayQuestion(tab.question)}
              />
            </div>

            {/* Webcam and answer recording */}

            <RecordAnswer
              question={tab}
              isWebCam={isWebCam}
              setIsWebCam={setIsWebCam}
            />

            {/* Finish Interview button - Last question only */}

            {index === questions.length - 1 && (
              <div className="w-full flex flex-col items-center justify-center gap-4 mt-10 mb-6">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Ready to Finish?
                  </h3>

                  <p className="text-sm text-muted-foreground max-w-md">
                    You have reached the final interview question.
                    Make sure you have saved your answer before finishing.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleFinishInterview}
                  className={cn(
                    "flex items-center justify-center gap-2",
                    "bg-emerald-500 hover:bg-emerald-600",
                    "text-white font-semibold",
                    "px-8 py-6 rounded-lg",
                    "shadow-md hover:shadow-lg",
                    "transition-all duration-200"
                  )}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Finish Interview
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};