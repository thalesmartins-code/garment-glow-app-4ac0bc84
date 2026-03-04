import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccess } from "@/config/roleAccess";

export function RoleRoute({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const location = useLocation();

  if (!canAccess(role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
