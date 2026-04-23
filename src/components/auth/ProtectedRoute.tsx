import { useEffect, useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { PageLoader } from "@/components/ui/PageLoader";

export function ProtectedRoute() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentOrg, loading: orgLoading } = useOrganization();
  const revokingAccessRef = useRef(false);

  useEffect(() => {
    if (authLoading || orgLoading || !user || currentOrg || revokingAccessRef.current) {
      return;
    }

    revokingAccessRef.current = true;
    void signOut();
  }, [authLoading, currentOrg, orgLoading, signOut, user]);

  if (authLoading || orgLoading) {
    return <PageLoader />;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!currentOrg) {
    return <PageLoader />;
  }

  return <Outlet />;
}
