export type AppRole = "admin" | "editor" | "viewer";

export const roleAccess: Record<string, AppRole[]> = {
  "/": ["admin", "editor", "viewer"],
  "/vendas-diarias": ["admin", "editor", "viewer"],
  "/importacao": ["admin", "editor"],
  "/configuracoes": ["admin", "editor"],
  "/sellers": ["admin", "editor"],
  "/usuarios": ["admin"],
  "/perfil": ["admin", "editor", "viewer"],
  "/integracoes": ["admin", "editor"],
  "/mercado-livre": ["admin", "editor", "viewer"],
  "/mercado-livre/estoque": ["admin", "editor", "viewer"],
  "/mercado-livre/produtos": ["admin", "editor", "viewer"],
  "/mercado-livre/pedidos": ["admin", "editor", "viewer"],
  "/mercado-livre/anuncios": ["admin", "editor", "viewer"],
};

export function canAccess(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[path];
  if (!allowed) return false; // default-deny: unlisted pages are blocked
  return allowed.includes(role);
}
