import { Award } from "lucide-react";
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
 * Currently the app only supports Mercado Livre.
 */
export const MARKETPLACE_BRANDS: MarketplaceBrand[] = [
  {
    id: "mercado-livre",
    name: "Mercado Livre",
    icon: Award,
    gradient: "from-[#e6b422] to-[#c9981a]",
    badge: "bg-[#e6b422]/10 text-[#b8911a] border-[#e6b422]/30",
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
};

/** Map from marketplace ids to seller shortcodes */
export const MP_TO_SELLER_ID: Record<string, string> = {
  "mercado-livre": "ml",
};
