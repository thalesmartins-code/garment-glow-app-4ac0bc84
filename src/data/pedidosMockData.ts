import { format, subDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "pending";

export type ListingType = "classic" | "premium" | "free";

export interface OrderItem {
  item_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  listing_type: ListingType;
}

export interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  item: OrderItem;
  gross_revenue: number;
  ml_commission: number;
  commission_rate: number;
  shipping_cost: number;
  free_shipping: boolean;
  net_revenue: number;
  net_margin_pct: number;
  buyer_nickname: string;
}

export interface PedidosSummary {
  total_orders: number;
  gross_revenue: number;
  ml_commission: number;
  shipping_cost: number;
  net_revenue: number;
  net_margin_pct: number;
  avg_ticket: number;
  cancelled_orders: number;
  cancellation_rate: number;
}

// ─── Rates ───────────────────────────────────────────────────────────────────

export const LISTING_RATES: Record<ListingType, number> = {
  classic: 0.115,
  premium: 0.165,
  free: 0.0,
};

// ─── Seeded PRNG ──────────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  return h & 0x7fffffff;
}

function storeSeed(storeId: string, extra: number): number {
  return (hashString(storeId) ^ extra) & 0x7fffffff || 1;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_TITLES = [
  "Tênis Nike Air Max 270 Masculino",
  "Camiseta Polo Ralph Lauren",
  "Shorts Academia Dry Fit Masculino",
  "Legging Cintura Alta Feminina",
  "Jaqueta Corta-Vento Impermeável",
  "Tênis Vans Old Skool 42",
  "Bermuda Cargo Masculina",
  "Blusa Cropped Feminina",
  "Casaco Moletom Com Capuz M",
  "Calça Jeans Slim Fit Masculina 40",
  "Kit 3 Meias Esportivas Cano Médio",
  "Boné Aba Curva Snapback",
  "Relógio Masculino Digital",
  "Mochila Esportiva 30L",
];

const BUYER_NICKNAMES = [
  "comprador_feliz", "cliente_sp_01", "marcos_mg", "julia_rj",
  "comprando_sempre", "usuario_br_42", "ana_silva_", "tech_shopper",
  "fashion_lover", "maria_cl", "rafael_23", "compras_online99",
];

const STATUSES: OrderStatus[] = [
  "delivered", "delivered", "delivered", "shipped", "shipped",
  "paid", "cancelled", "returned", "pending",
];

const LISTING_TYPES: ListingType[] = ["classic", "classic", "premium", "premium", "free"];

// ─── Generator ───────────────────────────────────────────────────────────────

export function getMockOrders(storeId: string, count = 60): Order[] {
  const rng = seededRandom(storeSeed(storeId, 0x0BD3));
  const today = new Date();

  return Array.from({ length: count }, (_, i) => {
    const titleIdx = Math.floor(rng() * PRODUCT_TITLES.length);
    const listing_type = LISTING_TYPES[Math.floor(rng() * LISTING_TYPES.length)];
    const unit_price = Math.round((80 + rng() * 620) * 100) / 100;
    const quantity = rng() < 0.75 ? 1 : Math.floor(2 + rng() * 3);
    const gross_revenue = Math.round(unit_price * quantity * 100) / 100;

    const commission_rate = LISTING_RATES[listing_type];
    const ml_commission = Math.round(gross_revenue * commission_rate * 100) / 100;

    const free_shipping = rng() < 0.4;
    const shipping_cost = free_shipping ? Math.round((12 + rng() * 18) * 100) / 100 : 0;

    const net_revenue = Math.round((gross_revenue - ml_commission - shipping_cost) * 100) / 100;
    const net_margin_pct = gross_revenue > 0
      ? Math.round((net_revenue / gross_revenue) * 10000) / 100
      : 0;

    const status = STATUSES[Math.floor(rng() * STATUSES.length)];
    const daysAgo = Math.floor(rng() * 60);

    return {
      id: `ML${1000000000 + i * 1337 + Math.floor(rng() * 9999)}`,
      date: format(subDays(today, daysAgo), "yyyy-MM-dd"),
      status,
      item: {
        item_id: `MLB${900000000 + titleIdx * 9999}`,
        title: PRODUCT_TITLES[titleIdx],
        quantity,
        unit_price,
        listing_type,
      },
      gross_revenue,
      ml_commission,
      commission_rate,
      shipping_cost,
      free_shipping,
      net_revenue,
      net_margin_pct,
      buyer_nickname: BUYER_NICKNAMES[Math.floor(rng() * BUYER_NICKNAMES.length)],
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export function computePedidosSummary(orders: Order[]): PedidosSummary {
  const active = orders.filter((o) => o.status !== "cancelled" && o.status !== "returned");
  const cancelled = orders.filter((o) => o.status === "cancelled" || o.status === "returned");

  const gross_revenue = active.reduce((s, o) => s + o.gross_revenue, 0);
  const ml_commission = active.reduce((s, o) => s + o.ml_commission, 0);
  const shipping_cost = active.reduce((s, o) => s + o.shipping_cost, 0);
  const net_revenue = active.reduce((s, o) => s + o.net_revenue, 0);

  return {
    total_orders: active.length,
    gross_revenue: Math.round(gross_revenue * 100) / 100,
    ml_commission: Math.round(ml_commission * 100) / 100,
    shipping_cost: Math.round(shipping_cost * 100) / 100,
    net_revenue: Math.round(net_revenue * 100) / 100,
    net_margin_pct: gross_revenue > 0
      ? Math.round((net_revenue / gross_revenue) * 10000) / 100
      : 0,
    avg_ticket: active.length > 0
      ? Math.round((gross_revenue / active.length) * 100) / 100
      : 0,
    cancelled_orders: cancelled.length,
    cancellation_rate: orders.length > 0
      ? Math.round((cancelled.length / orders.length) * 10000) / 100
      : 0,
  };
}
