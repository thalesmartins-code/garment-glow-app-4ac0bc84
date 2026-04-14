import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type AppRole = "admin" | "editor" | "viewer";

const STORAGE_KEY = "menu-visibility-config";

/** Routes that are HIDDEN per role (empty array = all visible) */
export type MenuVisibilityConfig = Record<AppRole, string[]>;

const DEFAULT_CONFIG: MenuVisibilityConfig = { admin: [], editor: [], viewer: [] };

/** All configurable menu items grouped by section — mirrors ApiSidebar */
export const MENU_SECTIONS = [
  {
    label: "Dashboard",
    items: [
      { label: "Vendas",      path: "/api" },
      { label: "Publicidade", path: "/api/publicidade" },
      { label: "Margem",      path: "/api/financeiro" },
    ],
  },
  {
    label: "Operações",
    items: [
      { label: "Anúncios", path: "/api/anuncios" },
      { label: "Estoque",  path: "/api/estoque" },
      { label: "Pedidos",  path: "/api/pedidos" },
    ],
  },
  {
    label: "Pós-venda",
    items: [
      { label: "Reputação",  path: "/api/reputacao" },
      { label: "Devoluções", path: "/api/devolucoes" },
      { label: "Mensagens",  path: "/api/perguntas" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { label: "Metas",       path: "/api/metas" },
      { label: "Sellers",     path: "/api/sellers" },
      { label: "Integrações", path: "/api/integracoes" },
    ],
  },
] as const;

function loadConfig(): MenuVisibilityConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONFIG;
}

interface MenuVisibilityContextType {
  config: MenuVisibilityConfig;
  isMenuItemVisible: (path: string, role: AppRole | null) => boolean;
  saveConfig: (config: MenuVisibilityConfig) => void;
}

const MenuVisibilityContext = createContext<MenuVisibilityContextType | undefined>(undefined);

export function MenuVisibilityProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<MenuVisibilityConfig>(loadConfig);

  const isMenuItemVisible = useCallback(
    (path: string, role: AppRole | null): boolean => {
      if (!role) return true; // no role = show everything (auth guards handle access)
      return !config[role].includes(path);
    },
    [config]
  );

  const saveConfig = useCallback((next: MenuVisibilityConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConfig(next);
  }, []);

  return (
    <MenuVisibilityContext.Provider value={{ config, isMenuItemVisible, saveConfig }}>
      {children}
    </MenuVisibilityContext.Provider>
  );
}

export function useMenuVisibility() {
  const ctx = useContext(MenuVisibilityContext);
  if (!ctx) throw new Error("useMenuVisibility must be used within MenuVisibilityProvider");
  return ctx;
}
