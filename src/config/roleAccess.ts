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

/**
 * Routes that can be individually toggled for viewers by owner/admin.
 * Viewers get DEFAULT-DENY: no access until owner/admin explicitly grants.
 * /api/perfil is always allowed for everyone (not in this list).
 */
export const VIEWER_ELIGIBLE_ROUTES: { path: string; label: string }[] = [
  { path: "/api", label: "Vendas (Dashboard)" },
  { path: "/api/estoque", label: "Estoque" },
  { path: "/api/anuncios", label: "Anúncios" },
  { path: "/api/publicidade", label: "Publicidade" },
  { path: "/api/reputacao", label: "Reputação" },
  { path: "/api/financeiro", label: "Financeiro" },
  { path: "/api/pedidos", label: "Pedidos" },
  { path: "/api/perguntas", label: "Perguntas" },
  { path: "/api/devolucoes", label: "Devoluções" },
  { path: "/api/metas", label: "Metas" },
  { path: "/api/precos-custos", label: "Preços e Custos" },
];

const VIEWER_ELIGIBLE_SET = new Set(VIEWER_ELIGIBLE_ROUTES.map((r) => r.path));

export function canAccess(role: OrgRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[path];
  if (!allowed) return false; // default-deny
  return allowed.includes(role);
}

/**
 * Access check that respects per-viewer custom permissions.
 * For viewers: route must be eligible AND explicitly granted in viewerPermissions.
 * For other roles: falls back to standard canAccess.
 */
export function canAccessWithViewer(
  role: OrgRole | null,
  path: string,
  viewerPermissions: Set<string>
): boolean {
  if (!role) return false;
  if (role !== "viewer") return canAccess(role, path);
  // Viewer: /api/perfil always allowed
  if (path === "/api/perfil") return true;
  // Must be eligible AND explicitly granted
  if (!VIEWER_ELIGIBLE_SET.has(path)) return false;
  return viewerPermissions.has(path);
}
