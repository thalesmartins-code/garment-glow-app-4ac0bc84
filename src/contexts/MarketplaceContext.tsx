import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Handshake, ShoppingBag, Package, Store, ShoppingCart, Footprints } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSeller } from "@/contexts/SellerContext";

export interface MarketplaceDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string; // tailwind gradient classes
  connected: boolean;
}

// Maps SellerContext marketplace shortcodes → MarketplaceContext ids
const SELLER_TO_MP: Record<string, string> = {
  "ml":     "mercado-livre",
  "amz":    "amazon",
  "shopee": "shopee",
  "magalu": "magalu",
  "netshoes": "netshoes",
  "dafiti":   "dafiti",
};

// Maps MarketplaceContext ids → SellerContext shortcodes
const MP_TO_SELLER: Record<string, string> = {
  "mercado-livre": "ml",
  "amazon":        "amz",
  "shopee":        "shopee",
  "magalu":        "magalu",
  "netshoes":      "netshoes",
  "dafiti":        "dafiti",
};

const allMarketplaces: MarketplaceDefinition[] = [
  {
    id: "mercado-livre",
    name: "Mercado Livre",
    icon: Handshake,
    color: "from-yellow-500 to-amber-500",
    connected: true,
  },
  {
    id: "amazon",
    name: "Amazon",
    icon: Package,
    color: "from-orange-500 to-amber-600",
    connected: true,
  },
  {
    id: "shopee",
    name: "Shopee",
    icon: ShoppingBag,
    color: "from-orange-600 to-red-500",
    connected: true,
  },
  {
    id: "magalu",
    name: "Magazine Luiza",
    icon: Store,
    color: "from-blue-600 to-indigo-500",
    connected: true,
  },
  {
    id: "netshoes",
    name: "Netshoes",
    icon: Footprints,
    color: "from-purple-600 to-violet-500",
    connected: true,
  },
  {
    id: "dafiti",
    name: "Dafiti",
    icon: ShoppingCart,
    color: "from-gray-500 to-gray-600",
    connected: true,
  },
];

interface MarketplaceState {
  marketplaces: MarketplaceDefinition[];
  selectedMarketplace: string; // "all" | MarketplaceDefinition.id | "ml-store:USER_ID"
  setSelectedMarketplace: (id: string) => void;
  activeMarketplace: MarketplaceDefinition | null;
  connectedMarketplaces: MarketplaceDefinition[];
}

const MarketplaceContext = createContext<MarketplaceState | null>(null);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const {
    selectedMarketplace: sellerMkt,
    setSelectedMarketplace: setSellerMkt,
    availableMarketplaces: sellerMps,
    selectedSeller,
  } = useSeller();

  // Track legacy ml sub-store selection (e.g. "ml-store:USER_ID")
  const [mlSubStoreKey, setMlSubStoreKey] = useState<string | null>(null);

  /**
   * Resolve the MarketplaceContext-style id from a sellerMkt value.
   * sellerMkt can be:
   *   "all"           → "all"
   *   "ml"|"amz"...   → "mercado-livre"|"amazon"... (shortcode)
   *   <store UUID>    → look up store, map its marketplace shortcode
   */
  const resolveMpId = useCallback(
    (mkt: string): string => {
      if (mkt === "all") return "all";
      if (SELLER_TO_MP[mkt]) return SELLER_TO_MP[mkt];
      // Store UUID: find the store and map its marketplace
      const store = selectedSeller?.stores.find((s) => s.id === mkt);
      if (store) return SELLER_TO_MP[store.marketplace] ?? store.marketplace;
      return "all";
    },
    [selectedSeller]
  );

  // Clear ml sub-store when not on ML marketplace
  useEffect(() => {
    const mpId = resolveMpId(sellerMkt);
    if (mpId !== "mercado-livre") setMlSubStoreKey(null);
  }, [sellerMkt, resolveMpId]);

  // Derive the MarketplaceContext-style selected value
  const selectedMarketplace = mlSubStoreKey ?? resolveMpId(sellerMkt);

  const setSelectedMarketplace = useCallback(
    (id: string) => {
      if (id.startsWith("ml-store:")) {
        // Legacy ML sub-store key — keep locally, set sellerMkt to "ml"
        setMlSubStoreKey(id);
        setSellerMkt("ml");
      } else {
        setMlSubStoreKey(null);
        // Could be "all", a MarketplaceContext id ("mercado-livre"), or a store UUID
        const sellerId = MP_TO_SELLER[id] ?? (id === "all" ? "all" : id);
        setSellerMkt(sellerId);
      }
    },
    [setSellerMkt]
  );

  // Build marketplace list; mark ones the seller doesn't have as not connected
  const sellerMpIds = new Set(sellerMps.map((m) => SELLER_TO_MP[m.id] ?? m.id));
  const marketplaces: MarketplaceDefinition[] = allMarketplaces.map((m) => ({
    ...m,
    connected: sellerMps.length === 0 ? m.connected : sellerMpIds.has(m.id),
  }));

  const connectedMarketplaces = marketplaces.filter((m) => m.connected);

  const activeMarketplace =
    selectedMarketplace === "all"
      ? null
      : selectedMarketplace.startsWith("ml-store:")
      ? (allMarketplaces.find((m) => m.id === "mercado-livre") ?? null)
      : (marketplaces.find((m) => m.id === selectedMarketplace) ?? null);

  return (
    <MarketplaceContext.Provider
      value={{
        marketplaces,
        selectedMarketplace,
        setSelectedMarketplace,
        activeMarketplace,
        connectedMarketplaces,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error("useMarketplace must be used within MarketplaceProvider");
  return ctx;
}
