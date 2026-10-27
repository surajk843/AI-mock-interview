import type { Interview } from "@/types";
import { useNavigate } from "react-router-dom";

import {
  Card,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { TooltipButton } from "./tooltip-button";
import { Eye, Newspaper, Sparkles } from "lucide-react";

interface InterviewPinProps {
  interview: Interview;
  onMockPage?: boolean;
}

const formatInterviewDate = (createdAt: unknown): string => {
  if (!createdAt) {
    return "Date unavailable";
  }

  let date: Date;

  if (createdAt instanceof Date) {
    date = createdAt;
  } else if (
    typeof createdAt === "string" ||
    typeof createdAt === "number"
  ) {
    date = new Date(createdAt);
  } else if (typeof createdAt === "object") {
    const timestamp = createdAt as {
      seconds?: number;
      _seconds?: number;
      toDate?: () => Date;
    };

    try {
      if (typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (typeof timestamp.seconds === "number") {
        date = new Date(timestamp.seconds * 1000);
      } else if (typeof timestamp._seconds === "number") {
        date = new Date(timestamp._seconds * 1000);
      } else {
        return "Date unavailable";
      }
    } catch {
      return "Date unavailable";
    }
  } else {
    return "Date unavailable";
  }

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

export const InterviewPin = ({
  interview,
  onMockPage = false,
}: InterviewPinProps) => {
  const navigate = useNavigate();

  const technologies = (interview.techStack || "")
    .split(",")
    .map((tech) => tech.trim())
    .filter(Boolean);

  return (
    <Card
      className={cn(
        "w-full h-fit flex flex-col justify-between",
        "border border-gray-200 dark:border-gray-800"
      )}
    >
      <div className="p-4">
        <CardTitle className="text-lg font-semibold">
          {interview.position}
        </CardTitle>

        <CardDescription className="mt-2 line-clamp-2">
          {interview.description}
        </CardDescription>

        <div className="flex flex-wrap gap-2 mt-4">
          {technologies.map((tech, index) => (
            <Badge key={`${tech}-${index}`} variant="secondary">
              {tech}
            </Badge>
          ))}
        </div>
      </div>

      <CardFooter className="flex items-center justify-between gap-3 border-t p-4">
        <p className="text-xs text-muted-foreground">
          {formatInterviewDate(interview.createdAt)}
        </p>

        {!onMockPage && (
          <div className="flex items-center gap-2">
            {/* Open the interview details/edit page */}
            <TooltipButton
              content="View interview"
              buttonVariant="ghost"
              onClick={() => navigate(`/generate/${interview.id}`)}
              icon={<Eye className="h-4 w-4" />}
              disabled={false}
            />

            {/* Open saved feedback */}
            <TooltipButton
              content="View feedback"
              buttonVariant="ghost"
              onClick={() =>
                navigate(`/generate/feedback/${interview.id}`)
              }
              icon={<Newspaper className="h-4 w-4" />}
              disabled={false}
            />

            {/* Open the interview preparation page */}
            <TooltipButton
              content="Start interview"
              buttonVariant="ghost"
              onClick={() =>
                navigate(`/generate/interview/${interview.id}`)
              }
              icon={<Sparkles className="h-4 w-4" />}
              disabled={false}
            />
          </div>
        )}
      </CardFooter>
    </Card>
  );
};