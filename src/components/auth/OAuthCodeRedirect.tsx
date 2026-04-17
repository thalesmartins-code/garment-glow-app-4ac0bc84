import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

/**
 * Detects OAuth `code` param on any page and redirects to /api/integracoes
 * preserving the code so it can be exchanged for a token.
 */
export function OAuthCodeRedirect({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get("code");
    const path = window.location.pathname;
    if (code && path !== "/api/integracoes") {
      navigate(`/api/integracoes?code=${encodeURIComponent(code)}`, { replace: true });
    }
  }, [searchParams, navigate]);

  return <>{children}</>;
}
