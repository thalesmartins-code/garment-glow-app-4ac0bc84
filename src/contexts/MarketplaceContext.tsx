import { createContext, useContext, useState, ReactNode } from "react";
import { Store, ShoppingCart, Package, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MarketplaceDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string; // tailwind gradient classes
  connected: boolean;
}

const defaultMarketplaces: MarketplaceDefinition[] = [
  {
    id: "mercado-livre",
    name: "Mercado Livre",
    icon: Store,
    color: "from-yellow-500 to-amber-500",
    connected: true, // ML is the only one actually integrated
  },
  {
    id: "amazon",
    name: "Amazon",
    icon: ShoppingCart,
    color: "from-orange-500 to-amber-600",
    connected: true,
  },
  {
    id: "shopee",
    name: "Shopee",
    icon: Package,
    color: "from-orange-600 to-red-500",
    connected: true,
  },
  {
    id: "magalu",
    name: "Magazine Luiza",
    icon: Truck,
    color: "from-blue-600 to-indigo-500",
    connected: true,
  },
];

interface MarketplaceState {
  marketplaces: MarketplaceDefinition[];
  selectedMarketplace: string; // "all" or marketplace id
  setSelectedMarketplace: (id: string) => void;
  activeMarketplace: MarketplaceDefinition | null;
  connectedMarketplaces: MarketplaceDefinition[];
}

const MarketplaceContext = createContext<MarketplaceState | null>(null);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("all");

  const connectedMarketplaces = defaultMarketplaces.filter((m) => m.connected);
  const activeMarketplace =
    selectedMarketplace === "all"
      ? null
      : defaultMarketplaces.find((m) => m.id === selectedMarketplace) ?? null;

  return (
    <MarketplaceContext.Provider
      value={{
        marketplaces: defaultMarketplaces,
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
