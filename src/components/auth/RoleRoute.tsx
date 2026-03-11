import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccess } from "@/config/roleAccess";
import { Loader2 } from "lucide-react";

export function RoleRoute({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  const location = useLocation();

  if (loading || role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccess(role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
