export type OrgRole = "owner" | "admin" | "member" | "viewer";
// Backwards-compat alias for any remaining imports
export type AppRole = OrgRole;

const ALL: OrgRole[] = ["owner", "admin", "member", "viewer"];
const OPERATIONAL: OrgRole[] = ["owner", "admin", "member"];
const ORG_ADMIN: OrgRole[] = ["owner", "admin"];
const OWNER_ONLY: OrgRole[] = ["owner"];

export const roleAccess: Record<string, OrgRole[]> = {
  "/api": ALL,
  "/api/estoque": ALL,
  "/api/anuncios": ALL,
  "/api/publicidade": ALL,
  "/api/financeiro": ALL,
  "/api/reputacao": ALL,
  "/api/vendas-hora": ALL,
  "/api/relatorios": ALL,
  "/api/perfil": ALL,
  "/api/pedidos": OPERATIONAL,
  "/api/perguntas": OPERATIONAL,
  "/api/devolucoes": OPERATIONAL,
  "/api/metas": OPERATIONAL,
  "/api/precos-custos": OPERATIONAL,
  "/api/organizacao": ORG_ADMIN,
  "/api/sellers": OWNER_ONLY,
  "/api/integracoes": OWNER_ONLY,
  "/api/monitoramento": OWNER_ONLY,
};

export function canAccess(role: OrgRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[path];
  if (!allowed) return false; // default-deny
  return allowed.includes(role);
}
