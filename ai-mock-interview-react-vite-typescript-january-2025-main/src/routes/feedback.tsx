import { useAuth } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CircleCheck, Star } from "lucide-react";

import type { Interview, UserAnswer } from "@/types";
import { LoaderPage } from "./loader-page";
import { CustomBreadCrumb } from "@/components/custom-bread-crumb";
import { Headings } from "@/components/headings";
import { InterviewPin } from "@/components/pin";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

const API_URL = "https://ai-mock-interview-api-vrzo.onrender.com";

export const Feedback = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [feedbacks, setFeedbacks] = useState<UserAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFeed, setActiveFeed] = useState("");

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

    const fetchFeedback = async () => {
      setIsLoading(true);

      try {
        const token = await getToken();

        if (!token) {
          throw new Error(
            "Unable to authenticate. Please sign in again."
          );
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [interviewResponse, feedbackResponse] = await Promise.all([
          fetch(
            `${API_URL}/api/interviews/${encodeURIComponent(interviewId)}`,
            {
              method: "GET",
              headers,
            }
          ),
          fetch(
            `${API_URL}/api/user-answers/${encodeURIComponent(interviewId)}`,
            {
              method: "GET",
              headers,
            }
          ),
        ]);

        const [interviewResult, feedbackResult] = await Promise.all([
          interviewResponse.json().catch(() => ({})),
          feedbackResponse.json().catch(() => ({})),
        ]);

        if (!interviewResponse.ok) {
          throw new Error(
            interviewResult.message ||
              interviewResult.error ||
              "Unable to load the interview."
          );
        }

        if (!feedbackResponse.ok) {
          throw new Error(
            feedbackResult.message ||
              feedbackResult.error ||
              "Unable to load interview feedback."
          );
        }

        if (!interviewResult.interview) {
          throw new Error("Interview not found.");
        }

        if (
          !Array.isArray(feedbackResult.answers) ||
          !feedbackResult.answers.every(
            (answer: UserAnswer) =>
              answer &&
              typeof answer.id === "string" &&
              typeof answer.question === "string" &&
              typeof answer.correct_ans === "string" &&
              typeof answer.user_ans === "string" &&
              typeof answer.feedback === "string" &&
              Number.isFinite(Number(answer.rating))
          )
        ) {
          throw new Error(
            "The backend returned an invalid feedback format."
          );
        }

        if (!cancelled) {
          setInterview(interviewResult.interview);
          setFeedbacks(feedbackResult.answers);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading feedback:", error);

          toast.error("Unable to load feedback", {
            description:
              error instanceof Error
                ? error.message
                : "Please try again later.",
          });

          setInterview(null);
          setFeedbacks([]);
          navigate("/generate", { replace: true });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchFeedback();

    return () => {
      cancelled = true;
    };
  }, [interviewId, isLoaded, isSignedIn, getToken, navigate]);

  const overallRating = useMemo(() => {
    if (feedbacks.length === 0) {
      return "0.0";
    }

    const totalRatings = feedbacks.reduce(
      (total, feedback) => total + Number(feedback.rating || 0),
      0
    );

    return (totalRatings / feedbacks.length).toFixed(1);
  }, [feedbacks]);

  if (!isLoaded || isLoading) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  if (!isSignedIn || !interview) {
    return null;
  }

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between w-full gap-2">
        <CustomBreadCrumb
          breadCrumbPage="Feedback"
          breadCrumbItems={[
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
      </div>

      {/* Overall feedback */}
      <Headings
        title="Congratulations!"
        description="Your personalized feedback is now available. Review your strengths, areas for improvement, and tips to help you prepare for your next interview."
      />

      <p className="text-base text-muted-foreground">
        Your overall interview rating:{" "}
        <span className="text-emerald-500 font-semibold text-xl">
          {overallRating} / 10
        </span>
      </p>

      <InterviewPin interview={interview} onMockPage />

      <Headings title="Interview Feedback" isSubHeading />

      {/* Individual question feedback */}
      {feedbacks.length > 0 ? (
        <Accordion
          type="single"
          collapsible
          className="space-y-6"
          onValueChange={setActiveFeed}
        >
          {feedbacks.map((feed) => (
            <AccordionItem
              key={feed.id}
              value={feed.id}
              className="border rounded-lg shadow-md"
            >
              <AccordionTrigger
                className={cn(
                  "px-5 py-3 flex items-center justify-between text-base rounded-t-lg transition-colors hover:no-underline",
                  activeFeed === feed.id
                    ? "bg-gradient-to-r from-purple-50 to-blue-50"
                    : "hover:bg-gray-50"
                )}
              >
                <span>{feed.question}</span>
              </AccordionTrigger>

              <AccordionContent className="px-5 py-6 bg-white rounded-b-lg space-y-5 shadow-inner">
                <div className="text-lg font-semibold text-gray-700">
                  <Star className="inline mr-2 text-yellow-400" />
                  Rating: {Number(feed.rating).toFixed(1)} / 10
                </div>

                <Card className="border-none space-y-3 p-4 bg-green-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-green-600" />
                    Expected Answer
                  </CardTitle>

                  <CardDescription className="font-medium text-gray-700 whitespace-pre-wrap">
                    {feed.correct_ans}
                  </CardDescription>
                </Card>

                <Card className="border-none space-y-3 p-4 bg-yellow-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-yellow-600" />
                    Your Answer
                  </CardTitle>

                  <CardDescription className="font-medium text-gray-700 whitespace-pre-wrap">
                    {feed.user_ans}
                  </CardDescription>
                </Card>

                <Card className="border-none space-y-3 p-4 bg-red-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-red-600" />
                    Feedback
                  </CardTitle>

                  <CardDescription className="font-medium text-gray-700 whitespace-pre-wrap">
                    {feed.feedback}
                  </CardDescription>
                </Card>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="text-muted-foreground">
          No feedback is available for this interview yet. Complete the
          interview and save your answers first.
        </p>
      )}
    </div>
  );
};