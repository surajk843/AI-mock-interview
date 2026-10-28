import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Lightbulb, Sparkles, WebcamIcon } from "lucide-react";
import { toast } from "sonner";
import WebCam from "react-webcam";

import type { Interview } from "@/types";
import { LoaderPage } from "./loader-page";
import { CustomBreadCrumb } from "@/components/custom-bread-crumb";
import { Button } from "@/components/ui/button";
import { InterviewPin } from "@/components/pin";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

const API_URL = "http://localhost:5000";

export const MockLoadPage = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWebCamEnabled, setIsWebCamEnabled] = useState(false);

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
      {/* Breadcrumb and start button */}
      <div className="flex items-center justify-between w-full gap-2">
        <CustomBreadCrumb
          breadCrumbPage={interview.position}
          breadCrumbItems={[
            {
              label: "Mock Interviews",
              link: "/generate",
            },
          ]}
        />

        <Link to={`/generate/interview/${interview.id}/start`}>
          <Button size="sm">
            Start <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Interview details */}
      <InterviewPin interview={interview} onMockPage />

      {/* Instructions */}
      <Alert className="bg-yellow-100/50 border-yellow-200 p-4 rounded-lg flex items-start gap-3 -mt-3">
        <Lightbulb className="h-5 w-5 text-yellow-600" />

        <div>
          <AlertTitle className="text-yellow-800 font-semibold">
            Important Information
          </AlertTitle>

          <AlertDescription className="text-sm text-yellow-700 mt-1">
            Enable your webcam and allow microphone access if you want to
            use speech recognition during your AI-generated mock interview.
            The interview contains the questions generated for this session.
            You can review the AI feedback after answering questions.

            <br />
            <br />

            <span className="font-medium">Note:</span> This component does
            not record or save webcam video. You can disable your webcam
            whenever you prefer.
          </AlertDescription>
        </div>
      </Alert>

      {/* Webcam preview */}
      <div className="flex items-center justify-center w-full">
        <div className="w-full h-[400px] md:w-96 flex flex-col items-center justify-center border p-4 bg-gray-50 rounded-md">
          {isWebCamEnabled ? (
            <WebCam
              audio={false}
              onUserMedia={() => setIsWebCamEnabled(true)}
              onUserMediaError={() => {
                setIsWebCamEnabled(false);

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
      </div>

      {/* Webcam controls */}
      <div className="flex items-center justify-center">
        <Button
          type="button"
          onClick={() =>
            setIsWebCamEnabled((enabled) => !enabled)
          }
        >
          {isWebCamEnabled ? "Disable Webcam" : "Enable Webcam"}
        </Button>
      </div>
    </div>
  );
};