export type OrgRole = "owner" | "admin" | "member" | "viewer";
// Backwards-compat alias for any remaining imports
export type AppRole = OrgRole;

const ALL: OrgRole[] = ["owner", "admin", "member", "viewer"];
const WRITE: OrgRole[] = ["owner", "admin", "member"];
const ADMIN: OrgRole[] = ["owner", "admin"];
const OWNER_ONLY: OrgRole[] = ["owner"];

export const roleAccess: Record<string, OrgRole[]> = {
  "/api": ALL,
  "/api/estoque": ALL,
  "/api/anuncios": ALL,
  "/api/pedidos": ALL,
  "/api/publicidade": ALL,
  "/api/financeiro": ALL,
  "/api/reputacao": ALL,
  "/api/devolucoes": ALL,
  "/api/perguntas": ALL,
  "/api/vendas-hora": ALL,
  "/api/relatorios": ALL,
  "/api/metas": ALL,
  "/api/precos-custos": ALL,
  "/api/sellers": WRITE,
  "/api/integracoes": WRITE,
  "/api/perfil": ALL,
  "/api/organizacao": ADMIN,
  "/api/monitoramento": ADMIN,
};

export function canAccess(role: OrgRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[path];
  if (!allowed) return false; // default-deny
  return allowed.includes(role);
}
