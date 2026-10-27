import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";

import type { Interview } from "@/types";
import { CustomBreadCrumb } from "@/components/custom-bread-crumb";
import { QuestionSection } from "@/components/question-section";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import { LoaderPage } from "./loader-page";

const API_URL = "http://localhost:5000";

export const MockInterviewPage = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      navigate("/signin", { replace: true });
      return;
    }

    if (!interviewId) {
      toast.error("Interview ID is missing.");
      navigate("/generate", { replace: true });
      return;
    }

    let cancelled = false;

    const fetchInterview = async () => {
      setIsLoading(true);

      try {
        const token = await getToken();

        if (!token) {
          throw new Error(
            "Unable to authenticate. Please sign in again."
          );
        }

        const response = await fetch(
          `${API_URL}/api/interviews/${encodeURIComponent(interviewId)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message ||
              result.error ||
              "Unable to load this interview."
          );
        }

        if (!result.interview) {
          throw new Error("Interview not found.");
        }

        if (!cancelled) {
          setInterview(result.interview);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading interview:", error);

          toast.error("Unable to load interview", {
            description:
              error instanceof Error
                ? error.message
                : "Please try again.",
          });

          setInterview(null);
          navigate("/generate", { replace: true });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchInterview();

    return () => {
      cancelled = true;
    };
  }, [
    interviewId,
    isLoaded,
    isSignedIn,
    getToken,
    navigate,
  ]);

  if (!isLoaded || isLoading) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  if (!isSignedIn || !interview) {
    return null;
  }

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      <CustomBreadCrumb
        breadCrumpPage="Start"
        breadCrumpItems={[
          {
            label: "Mock Interviews",
            link: "/generate",
          },
          {
            label: interview.position,
            link: `/generate/interview/${interview.id}`,
          },
        ]}
      />

      <Alert className="bg-sky-100 border border-sky-200 p-4 rounded-lg flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-sky-600" />

        <div>
          <AlertTitle className="text-sky-800 font-semibold">
            Important Note
          </AlertTitle>

          <AlertDescription className="text-sm text-sky-700 mt-1 leading-relaxed">
            Press the recording button to begin answering each question.
            After you finish answering, you can review the AI feedback and
            save your response.

            <br />
            <br />

            <strong>Note:</strong> Your video is not recorded or saved by
            this component. You can disable the webcam whenever you prefer.
          </AlertDescription>
        </div>
      </Alert>

      {interview.questions?.length > 0 ? (
        <div className="mt-4 w-full flex flex-col items-start gap-4">
          <QuestionSection questions={interview.questions} />
        </div>
      ) : (
        <div className="w-full rounded-md border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            This interview has no questions. Return to your dashboard and
            edit or recreate the interview.
          </p>
        </div>
      )}
    </div>
  );
};