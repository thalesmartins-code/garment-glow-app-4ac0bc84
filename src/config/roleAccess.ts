export type AppRole = "admin" | "editor" | "viewer";

export const roleAccess: Record<string, AppRole[]> = {
  "/": ["admin", "editor", "viewer"],
  "/sheets": ["admin", "editor", "viewer"],
  "/sheets/vendas-diarias": ["admin", "editor", "viewer"],
  "/sheets/importacao": ["admin", "editor"],
  "/sheets/configuracoes": ["admin", "editor"],
  "/sheets/sellers": ["admin", "editor"],
  "/sheets/usuarios": ["admin"],
  "/perfil": ["admin", "editor", "viewer"],
  "/sheets/integracoes": ["admin", "editor"],
  "/api": ["admin", "editor", "viewer"],
  "/api/estoque": ["admin", "editor", "viewer"],
  "/api/produtos": ["admin", "editor", "viewer"],
  "/api/pedidos": ["admin", "editor", "viewer"],
  "/api/anuncios": ["admin", "editor", "viewer"],
  "/api/sincronizacoes": ["admin", "editor", "viewer"],
  "/api/vendas-hora": ["admin", "editor", "viewer"],
  "/api/importacao": ["admin", "editor"],
  "/api/relatorios": ["admin", "editor", "viewer"],
  "/api/sellers": ["admin", "editor"],
  "/api/integracoes": ["admin", "editor"],
  "/api/perfil": ["admin", "editor", "viewer"],
};

export function canAccess(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[path];
  if (!allowed) return false; // default-deny: unlisted pages are blocked
  return allowed.includes(role);
}
