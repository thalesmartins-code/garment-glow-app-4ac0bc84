export type AppRole = "admin" | "editor" | "viewer";

export const roleAccess: Record<string, AppRole[]> = {
  "/api": ["admin", "editor", "viewer"],
  "/api/estoque": ["admin", "editor", "viewer"],
  "/api/anuncios": ["admin", "editor", "viewer"],
  "/api/pedidos": ["admin", "editor", "viewer"],
  "/api/publicidade": ["admin", "editor", "viewer"],
  "/api/financeiro": ["admin", "editor", "viewer"],
  "/api/reputacao": ["admin", "editor", "viewer"],
  "/api/devolucoes": ["admin", "editor", "viewer"],
  "/api/perguntas": ["admin", "editor", "viewer"],
  "/api/sincronizacoes": ["admin", "editor", "viewer"],
  "/api/vendas-hora": ["admin", "editor", "viewer"],
  "/api/relatorios": ["admin", "editor", "viewer"],
  "/api/metas": ["admin", "editor", "viewer"],
  "/api/precos-custos": ["admin", "editor", "viewer"],
  "/api/sellers": ["admin", "editor"],
  "/api/integracoes": ["admin", "editor"],
  "/api/perfil": ["admin", "editor", "viewer"],
  "/api/usuarios": ["admin"],
  "/api/monitoramento": ["admin"],
};

export function canAccess(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[path];
  if (!allowed) return false; // default-deny
  return allowed.includes(role);
}
