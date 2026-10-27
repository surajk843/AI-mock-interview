import type { ReactNode } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

import { LoaderPage } from "@/routes/loader-page";

interface ProtectRoutesProps {
  children: ReactNode;
}

const ProtectRoutes = ({ children }: ProtectRoutesProps) => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoaderPage />;
  }

  if (!isSignedIn) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};

export default ProtectRoutes;