import { Navigate, useLocation } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { canAccess } from "@/config/roleAccess";
import { PageLoader } from "@/components/ui/PageLoader";

export function RoleRoute({ children }: { children: React.ReactNode }) {
  const { orgRole, loading } = useOrganization();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!orgRole) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccess(orgRole, location.pathname)) {
    return <Navigate to="/api" replace />;
  }

  return <>{children}</>;
}
