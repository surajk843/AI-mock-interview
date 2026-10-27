import { FormMockInterview } from "@/components/form-mock-interview";
import { Interview } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LoaderPage } from "./loader-page";
import { toast } from "sonner";

const API_URL = "http://localhost:5000";

export const CreateEditPage = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      navigate("/signin", { replace: true });
      return;
    }

    // No interviewId means this is the create page.
    if (!interviewId) {
      setInterview(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchInterview = async () => {
      setIsLoading(true);

      try {
        const token = await getToken();

        if (!token) {
          throw new Error("Unable to authenticate. Please sign in again.");
        }

        const response = await fetch(
          `${API_URL}/api/interviews/${encodeURIComponent(interviewId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to load this interview."
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
  }, [interviewId, isLoaded, isSignedIn, getToken, navigate]);

  if (!isLoaded || isLoading) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="my-4 flex-col w-full">
      <FormMockInterview initialData={interview} />
    </div>
  );
};