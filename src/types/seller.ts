export interface SellerStore {
  id: string;
  seller_id: string;
  marketplace: string;   // e.g. "ml", "shopee", "amz"
  store_name: string;    // e.g. "Shopee Sports", "ML SP"
  external_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Seller {
  id: string;
  name: string;
  initials: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  stores: SellerStore[];
  // Legacy compat: derived from stores
  activeMarketplaces: string[];
  isActive: boolean;
}

export const ALL_MARKETPLACES = [
  { id: "ml", name: "Mercado Livre" },
] as const;

export type MarketplaceId = typeof ALL_MARKETPLACES[number]["id"];

export function generateInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/** Build a Seller object from DB rows, computing derived fields */
export function buildSeller(
  row: { id: string; name: string; initials: string | null; logo_url?: string | null; is_active: boolean; created_at: string },
  stores: SellerStore[]
): Seller {
  const activeMarketplaces = [...new Set(stores.map((s) => s.marketplace))];
  return {
    id: row.id,
    name: row.name,
    initials: row.initials ?? generateInitials(row.name),
    logo_url: row.logo_url ?? null,
    is_active: row.is_active,
    isActive: row.is_active,
    created_at: row.created_at,
    stores,
    activeMarketplaces,
  };
}
