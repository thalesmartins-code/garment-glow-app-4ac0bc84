import { Handshake, Package, ShoppingBag, Store, ShoppingCart, CircleDot, Home, BarChart3, SportShoe } from "lucide-react";
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
    icon: Handshake,
    gradient: "from-yellow-500 to-amber-500",
    badge: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  },
  {
    id: "amazon",
    name: "Amazon",
    icon: Package,
    gradient: "from-[#2162a1] to-[#1a4f85]",
    badge: "bg-[#2162a1]/10 text-[#2162a1] border-[#2162a1]/30",
  },
  {
    id: "shopee",
    name: "Shopee",
    icon: ShoppingBag,
    gradient: "from-orange-600 to-red-500",
    badge: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  },
  {
    id: "magalu",
    name: "Magazine Luiza",
    icon: Store,
    gradient: "from-blue-600 to-indigo-500",
    badge: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  {
    id: "netshoes",
    name: "Netshoes",
    icon: SportShoe,
    gradient: "from-purple-600 to-violet-500",
    badge: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  },
  {
    id: "dafiti",
    name: "Dafiti",
    icon: ShoppingCart,
    gradient: "from-gray-500 to-gray-600",
    badge: "bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800/50 dark:text-gray-100 dark:border-gray-600",
  },
  {
    id: "americanas",
    name: "Americanas",
    icon: CircleDot,
    gradient: "from-red-500 to-red-600",
    badge: "bg-red-500/10 text-red-600 border-red-500/30",
  },
  {
    id: "casasbahia",
    name: "Casas Bahia",
    icon: Home,
    gradient: "from-blue-500 to-blue-600",
    badge: "bg-blue-500/10 text-blue-600 border-blue-500/30",
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
