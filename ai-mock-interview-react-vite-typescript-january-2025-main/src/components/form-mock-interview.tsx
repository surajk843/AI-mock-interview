import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Loader, Trash2 } from "lucide-react";

import type { Interview } from "@/types";
import { CustomBreadCrumb } from "./custom-bread-crumb";
import { Headings } from "./headings";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";

import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface FormMockInterviewProps {
  initialData: Interview | null;
}

interface InterviewQuestion {
  question: string;
  answer: string;
}

const API_URL = "http://localhost:5000";

const formSchema = z.object({
  position: z
    .string()
    .trim()
    .min(1, "Position is required")
    .max(100, "Position must be 100 characters or less"),

  description: z
    .string()
    .trim()
    .min(10, "Description must contain at least 10 characters"),

  experience: z.coerce
    .number()
    .finite()
    .min(0, "Experience cannot be negative")
    .max(60, "Experience cannot exceed 60 years"),

  techStack: z
    .string()
    .trim()
    .min(1, "Tech stack is required"),
});

type FormData = z.infer<typeof formSchema>;

const EMPTY_FORM_VALUES: FormData = {
  position: "",
  description: "",
  experience: 0,
  techStack: "",
};

export const FormMockInterview = ({
  initialData,
}: FormMockInterviewProps) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          position: initialData.position,
          description: initialData.description,
          experience: initialData.experience,
          techStack: initialData.techStack,
        }
      : EMPTY_FORM_VALUES,
  });

  const { isValid, isSubmitting } = form.formState;

  const isEditing = Boolean(initialData?.id);

  const title = initialData
    ? initialData.position
    : "Create a new mock interview";

  const breadCrumpPage = initialData
    ? initialData.position
    : "Create";

  const actions = isEditing ? "Save Changes" : "Create";

  const toastMessage = isEditing
    ? {
        title: "Updated!",
        description: "Changes saved successfully.",
      }
    : {
        title: "Created!",
        description: "New mock interview created successfully.",
      };

  /**
   * Retrieve the Clerk authentication token.
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
   * Reset the form fields and clear validation errors.
   *
   * This function does not call the backend or save any changes.
   */
  const handleReset = () => {
    if (loading || isSubmitting) {
      return;
    }

    form.reset(EMPTY_FORM_VALUES);
  };

  /**
   * Generate five interview questions using the backend Gemini API.
   */
  const generateAiResponse = async (
    data: FormData,
    token: string
  ): Promise<InterviewQuestion[]> => {
    const response = await fetch(
      `${API_URL}/api/gemini/generate-questions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message ||
          result.error ||
          "Failed to generate interview questions."
      );
    }

    const questions = result.questions;

    const validQuestions =
      Array.isArray(questions) &&
      questions.length === 5 &&
      questions.every(
        (item: unknown) =>
          typeof item === "object" &&
          item !== null &&
          "question" in item &&
          "answer" in item &&
          typeof item.question === "string" &&
          typeof item.answer === "string" &&
          item.question.trim().length > 0 &&
          item.answer.trim().length > 0
      );

    if (!validQuestions) {
      throw new Error(
        "The backend returned an invalid interview-question format."
      );
    }

    return questions as InterviewQuestion[];
  };

  /**
   * Delete an interview through the authenticated backend.
   */
  const handleDelete = async () => {
    if (!initialData?.id) {
      toast.error("Unable to delete interview.", {
        description: "The interview ID is missing.",
      });

      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this mock interview and its saved answers? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      const token = await getAuthToken();

      const response = await fetch(
        `${API_URL}/api/interviews/${encodeURIComponent(initialData.id)}`,
        {
          method: "DELETE",
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
            "Failed to delete interview."
        );
      }

      toast.success("Interview deleted successfully.");

      navigate("/generate", { replace: true });
    } catch (error) {
      console.error("Delete interview error:", error);

      toast.error("Failed to delete interview.", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create or update an interview through the backend.
   */
  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const token = await getAuthToken();

      // Generate questions through the protected backend endpoint.
      const questions = await generateAiResponse(data, token);

      const url = isEditing
        ? `${API_URL}/api/interviews/${encodeURIComponent(initialData!.id)}`
        : `${API_URL}/api/interviews`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          questions,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            "Failed to save interview."
        );
      }

      toast.success(toastMessage.title, {
        description: toastMessage.description,
      });

      navigate("/generate", { replace: true });
    } catch (error) {
      console.error("Save interview error:", error);

      toast.error("Error saving interview.", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Populate the form when editing an existing interview.
   */
  useEffect(() => {
    if (initialData) {
      form.reset({
        position: initialData.position,
        description: initialData.description,
        experience: initialData.experience,
        techStack: initialData.techStack,
      });
    } else {
      form.reset(EMPTY_FORM_VALUES);
    }
  }, [initialData, form]);

  return (
    <div className="w-full flex-col space-y-4">
      <CustomBreadCrumb
        breadCrumpPage={breadCrumpPage}
        breadCrumpItems={[
          {
            label: "Mock Interviews",
            link: "/generate",
          },
        ]}
      />

      <div className="mt-4 flex items-center justify-between w-full">
        <Headings title={title} isSubHeading />

        {initialData && (
          <Button
            size="icon"
            variant="ghost"
            type="button"
            onClick={handleDelete}
            disabled={loading || isSubmitting}
            title="Delete interview"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="min-w-4 min-h-4 text-red-500" />
            )}
          </Button>
        )}
      </div>

      <Separator className="my-4" />

      <div className="my-6" />

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full p-8 rounded-lg flex-col flex items-start justify-start gap-6 shadow-md"
        >
          {/* Job Position */}
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Job Role / Job Position</FormLabel>
                  <FormMessage className="text-sm" />
                </div>

                <FormControl>
                  <Input
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- Full Stack Developer"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Job Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Job Description</FormLabel>
                  <FormMessage className="text-sm" />
                </div>

                <FormControl>
                  <Textarea
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- Describe your job role"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Experience */}
          <FormField
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Years of Experience</FormLabel>
                  <FormMessage className="text-sm" />
                </div>

                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    step="1"
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- 5 Years"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Tech Stack */}
          <FormField
            control={form.control}
            name="techStack"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Tech Stacks</FormLabel>
                  <FormMessage className="text-sm" />
                </div>

                <FormControl>
                  <Textarea
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- React, TypeScript..."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="w-full flex items-center justify-end gap-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={loading || isSubmitting}
            >
              Reset
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={
                isSubmitting ||
                !isValid ||
                loading ||
                !isLoaded ||
                !isSignedIn
              }
            >
              {loading ? (
                <Loader className="text-gray-50 animate-spin" />
              ) : (
                actions
              )}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};