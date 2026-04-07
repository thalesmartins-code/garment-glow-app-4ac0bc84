import { Award, Package, ShoppingBag, Store, ShoppingCart, CircleDot, Home, BarChart3, SportShoe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MarketplaceBrand {
  id: string;
  name: string;
  icon: LucideIcon;
  /** Tailwind gradient classes, e.g. "from-yellow-500 to-amber-500" */
  gradient: string;
  /** Tailwind badge/chip classes for lighter UI contexts */
  badge: string;
}

/**
 * Single source of truth for marketplace icons, names, and colors.
 * Import this everywhere instead of defining local icon maps.
 */
export const MARKETPLACE_BRANDS: MarketplaceBrand[] = [
  {
    id: "mercado-livre",
    name: "Mercado Livre",
    icon: Award,
    gradient: "from-[#e6b422] to-[#c9981a]",
    badge: "bg-[#e6b422]/10 text-[#b8911a] border-[#e6b422]/30",
  },
  {
    id: "amazon",
    name: "Amazon",
    icon: Package,
    gradient: "from-[#131A22] to-[#232F3E]",
    badge: "bg-[#131A22]/10 text-[#232F3E] border-[#131A22]/30",
  },
  {
    id: "shopee",
    name: "Shopee",
    icon: ShoppingBag,
    gradient: "from-[#d4532a] to-[#b8412a]",
    badge: "bg-[#d4532a]/10 text-[#d4532a] border-[#d4532a]/30",
  },
  {
    id: "magalu",
    name: "Magazine Luiza",
    icon: Store,
    gradient: "from-[#3b6dba] to-[#4a5ea8]",
    badge: "bg-[#3b6dba]/10 text-[#3b6dba] border-[#3b6dba]/30",
  },
  {
    id: "netshoes",
    name: "Netshoes",
    icon: SportShoe,
    gradient: "from-[#7a4db5] to-[#6a3fa0]",
    badge: "bg-[#7a4db5]/10 text-[#7a4db5] border-[#7a4db5]/30",
  },
  {
    id: "dafiti",
    name: "Dafiti",
    icon: ShoppingCart,
    gradient: "from-[#2a9d8f] to-[#238b80]",
    badge: "bg-[#2a9d8f]/10 text-[#2a9d8f] border-[#2a9d8f]/30",
  },
  {
    id: "americanas",
    name: "Americanas",
    icon: CircleDot,
    gradient: "from-[#c44040] to-[#a83535]",
    badge: "bg-[#c44040]/10 text-[#c44040] border-[#c44040]/30",
  },
  {
    id: "casasbahia",
    name: "Casas Bahia",
    icon: Home,
    gradient: "from-[#3a7cc4] to-[#2e6aab]",
    badge: "bg-[#3a7cc4]/10 text-[#3a7cc4] border-[#3a7cc4]/30",
  },
  {
    id: "total",
    name: "Total",
    icon: BarChart3,
    gradient: "from-gray-600 to-gray-700",
    badge: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  },
];

/** Lookup by marketplace id (full id like "mercado-livre" or shortcode like "ml") */
export const getMarketplaceBrand = (id: string): MarketplaceBrand | undefined => {
  const fullId = SELLER_TO_MP_ID[id] ?? id;
  return MARKETPLACE_BRANDS.find((m) => m.id === fullId);
};

/** Map from seller shortcodes to marketplace ids */
export const SELLER_TO_MP_ID: Record<string, string> = {
  ml: "mercado-livre",
  amz: "amazon",
  shopee: "shopee",
  magalu: "magalu",
  netshoes: "netshoes",
  dafiti: "dafiti",
  americanas: "americanas",
  casasbahia: "casasbahia",
  total: "total",
};

/** Map from marketplace ids to seller shortcodes */
export const MP_TO_SELLER_ID: Record<string, string> = {
  "mercado-livre": "ml",
  amazon: "amz",
  shopee: "shopee",
  magalu: "magalu",
  netshoes: "netshoes",
  dafiti: "dafiti",
  americanas: "americanas",
  casasbahia: "casasbahia",
  total: "total",
};
