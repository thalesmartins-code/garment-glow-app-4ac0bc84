export interface Seller {
  id: string;
  name: string;
  initials: string;
  activeMarketplaces: string[];
  createdAt: string;
  isActive: boolean;
}

export const ALL_MARKETPLACES = [
  { id: "ml", name: "Mercado Livre", logo: "🟡" },
  { id: "amz", name: "Amazon", logo: "📦" },
  { id: "shopee", name: "Shopee", logo: "🧡" },
  { id: "magalu", name: "Magazine Luiza", logo: "🔵" },
  { id: "americanas", name: "Americanas", logo: "🔴" },
  { id: "casasbahia", name: "Casas Bahia", logo: "🏠" },
  { id: "dafiti", name: "Dafiti", logo: "👗" },
  { id: "netshoes", name: "Netshoes", logo: "👟" },
  { id: "total", name: "Total", logo: "📊" },
];

export const DEFAULT_SELLERS: Seller[] = [
  {
    id: "sandrini",
    name: "Sandrini",
    initials: "SA",
    activeMarketplaces: ["ml", "amz", "shopee", "magalu", "dafiti", "netshoes", "total"],
    createdAt: new Date().toISOString(),
    isActive: true,
  },
  {
    id: "buyclock",
    name: "BuyClock",
    initials: "BC",
    activeMarketplaces: ["ml", "amz", "shopee", "magalu", "total"],
    createdAt: new Date().toISOString(),
    isActive: true,
  },
];

export function generateSellerId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateInitials(name: string): string {
  const words = name.split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
