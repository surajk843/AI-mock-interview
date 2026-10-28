import { Headings } from "@/components/headings";
import { InterviewPin } from "@/components/pin";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Interview } from "@/types";

import { useAuth } from "@clerk/clerk-react";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const API_URL = "https://ai-mock-interview-api-vrzo.onrender.com";

export const Dashboard = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  const { userId, isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      navigate("/signin", { replace: true });
      return;
    }

    let cancelled = false;

    const fetchInterviews = async () => {
      setLoading(true);

      try {
        const token = await getToken();

        if (!token) {
          throw new Error(
            "Unable to authenticate. Please sign in again."
          );
        }

        const response = await fetch(`${API_URL}/api/interviews`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message ||
              result.error ||
              `Failed to fetch interviews (${response.status}).`
          );
        }

        if (!Array.isArray(result.interviews)) {
          throw new Error(
            "The backend returned an invalid interviews response."
          );
        }

        if (!cancelled) {
          setInterviews(result.interviews);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching interviews:", error);

          toast.error("Unable to load interviews", {
            description:
              error instanceof Error
                ? error.message
                : "Something went wrong. Please try again.",
          });

          setInterviews([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchInterviews();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId, getToken, navigate]);

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <Headings
          title="Dashboard"
          description="Create and start your AI Mock Interview"
        />

        <Link to="/generate/create">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Add New
          </Button>
        </Link>
      </div>

      <Separator className="my-8" />

      <div className="md:grid md:grid-cols-3 gap-3 py-4">
        {loading || !isLoaded ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-24 md:h-32 rounded-md"
            />
          ))
        ) : interviews.length > 0 ? (
          interviews.map((interview) => (
            <InterviewPin
              key={interview.id}
              interview={interview}
            />
          ))
        ) : (
          <div className="md:col-span-3 w-full flex flex-grow items-center justify-center h-96 flex-col">
            <img
              src="/assets/svg/not-found.svg"
              className="w-44 h-44 object-contain"
              alt="No interviews found"
            />

            <h2 className="text-lg font-semibold text-muted-foreground">
              No Data Found
            </h2>

            <p className="w-full md:w-96 text-center text-sm text-neutral-400 mt-4">
              There are no interviews to show. Please create a new mock
              interview.
            </p>

            <Link to="/generate/create" className="mt-4">
              <Button size="sm">
                <Plus className="min-w-5 min-h-5 mr-1" />
                Add New
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};