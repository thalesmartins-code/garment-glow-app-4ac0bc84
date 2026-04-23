import { useOrganization } from "@/contexts/OrganizationContext";
import { canAccessWithViewer } from "@/config/roleAccess";
import { PageLoader } from "@/components/ui/PageLoader";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Guard para o Modo TV (/tv).
 * Reaproveita as permissões da rota / (Vendas/Dashboard):
 * quem pode ver o dashboard de vendas pode abrir o Modo TV.
 */
export function TVRoleGuard({ children }: { children: React.ReactNode }) {
  const { orgRole, loading, viewerPermissions } = useOrganization();
  const navigate = useNavigate();

  if (loading) return <PageLoader />;

  const allowed = canAccessWithViewer(orgRole, "/", viewerPermissions);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">Sem permissão</h1>
            <p className="text-sm text-muted-foreground">
              Você não tem acesso ao Modo TV. Solicite ao administrador da
              organização permissão para o dashboard de Vendas.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate("/perfil")}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}