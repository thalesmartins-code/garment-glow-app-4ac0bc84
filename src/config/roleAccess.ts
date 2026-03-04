export type AppRole = "admin" | "editor" | "viewer";

export const roleAccess: Record<string, AppRole[]> = {
  "/": ["admin", "editor", "viewer"],
  "/vendas-diarias": ["admin", "editor", "viewer"],
  "/importacao": ["admin", "editor"],
  "/configuracoes": ["admin", "editor"],
  "/sellers": ["admin", "editor"],
  "/usuarios": ["admin"],
  "/perfil": ["admin", "editor", "viewer"],
};

export function canAccess(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = roleAccess[path];
  if (!allowed) return true; // pages not listed are accessible
  return allowed.includes(role);
}
