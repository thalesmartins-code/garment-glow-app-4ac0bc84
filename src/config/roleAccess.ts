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
  "/mercado-livre": ["admin", "editor", "viewer"],
  "/mercado-livre/estoque": ["admin", "editor", "viewer"],
  "/mercado-livre/produtos": ["admin", "editor", "viewer"],
  "/mercado-livre/pedidos": ["admin", "editor", "viewer"],
  "/mercado-livre/anuncios": ["admin", "editor", "viewer"],
  "/mercado-livre/integracoes": ["admin", "editor"],
  "/mercado-livre/perfil": ["admin", "editor", "viewer"],
};

export function canAccess(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[path];
  if (!allowed) return false; // default-deny: unlisted pages are blocked
  return allowed.includes(role);
}
