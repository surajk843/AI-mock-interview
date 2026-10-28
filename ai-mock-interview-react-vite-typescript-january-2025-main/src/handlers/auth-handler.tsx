import { useUser, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

const API_URL = "https://ai-mock-interview-api-vrzo.onrender.com";

const AuthHanlder = () => {
  const { isLoaded: isAuthLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const { pathname } = useLocation();

  useEffect(() => {
    if (
      !isAuthLoaded ||
      !isUserLoaded ||
      !isSignedIn ||
      !user
    ) {
      return;
    }

    let cancelled = false;

    const syncUser = async () => {
      try {
        const token = await getToken();

        if (!token) {
          throw new Error("Unable to authenticate. Please sign in again.");
        }

        const name =
          user.fullName?.trim() ||
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

        const email =
          user.primaryEmailAddress?.emailAddress?.trim();

        if (!name || !email) {
          throw new Error(
            "Your Clerk profile is missing a name or email address. Please check your profile."
          );
        }

        const response = await fetch(`${API_URL}/api/users/me`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            imageUrl: user.imageUrl || "",
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error ||
              result.message ||
              "Unable to synchronize your user profile."
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error("User synchronization error:", error);

          toast.error("Unable to synchronize your profile", {
            description:
              error instanceof Error
                ? error.message
                : "Please try again.",
          });
        }
      }
    };

    void syncUser();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthLoaded,
    isUserLoaded,
    isSignedIn,
    user,
    getToken,
    pathname,
  ]);

  return null;
};

export default AuthHanlder;