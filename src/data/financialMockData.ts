import { format, subDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FinancialDailyStat {
  date: string;
  gross_revenue: number;
  ml_commission: number;
  shipping_cost: number;
  net_revenue: number;
  orders_count: number;
  avg_commission_rate: number;
  free_shipping_orders: number;
  free_shipping_cost: number;
}

export interface ListingTypeStat {
  type: "classic" | "premium" | "free";
  label: string;
  rate: number;
  orders: number;
  gross_revenue: number;
  commission: number;
}

export interface ShippingBreakdown {
  total_shipped_orders: number;
  free_shipping_orders: number;
  free_shipping_pct: number;
  total_shipping_cost: number;
  avg_shipping_cost_per_order: number;
  mercado_envios_cost: number;
}

export interface FinancialSummary {
  gross_revenue: number;
  ml_commission: number;
  shipping_cost: number;
  net_revenue: number;
  net_margin_pct: number;
  avg_commission_rate: number;
  total_orders: number;
}

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

// ─── ML commission rates by listing type ────────────────────────────────────

export const LISTING_TYPE_RATES = {
  classic: { label: "Clássico",  rate: 0.115 },
  premium: { label: "Premium",   rate: 0.165 },
  free:    { label: "Grátis",    rate: 0.000 },
} as const;

/**
 * Generate per-day financial stats based on gross revenue and estimated fees.
 * When `revenueByDay` is provided (real data), fees are computed on top of it.
 * Otherwise falls back to seeded mock revenue.
 */
export function getFinancialDailyStats(
  storeId: string,
  daysBack: number,
  revenueByDay?: { date: string; total: number; qty: number }[],
): FinancialDailyStat[] {
  const rng = seededRandom(storeSeed(storeId, 3317));
  const today = new Date();

  const days = Array.from({ length: daysBack }, (_, i) => {
    const date = format(subDays(today, daysBack - 1 - i), "yyyy-MM-dd");
    const realDay = revenueByDay?.find((r) => r.date === date);

    // Use real or mock gross revenue
    const gross_revenue = realDay
      ? realDay.total
      : Math.round((rng() * 2000 + 400) * 100) / 100;
    const orders_count = realDay ? realDay.qty : Math.floor(rng() * 25 + 5);

    // Mix of listing types per day (slightly varying)
    const classic_pct = 0.50 + rng() * 0.10;
    const premium_pct = 0.35 + rng() * 0.08;
    // free_pct = remainder

    const classic_rev = gross_revenue * classic_pct;
    const premium_rev = gross_revenue * premium_pct;

    const ml_commission =
      Math.round(
        (classic_rev * LISTING_TYPE_RATES.classic.rate +
          premium_rev * LISTING_TYPE_RATES.premium.rate) *
          100,
      ) / 100;

    // Free shipping: ~35-50% of orders, each costing R$12–R$28
    const free_shipping_pct = 0.35 + rng() * 0.15;
    const free_shipping_orders = Math.floor(orders_count * free_shipping_pct);
    const avg_shipping = 12 + rng() * 16;
    const shipping_cost = Math.round(free_shipping_orders * avg_shipping * 100) / 100;

    const net_revenue = Math.round((gross_revenue - ml_commission - shipping_cost) * 100) / 100;
    const avg_commission_rate =
      gross_revenue > 0
        ? Math.round((ml_commission / gross_revenue) * 10000) / 100
        : 0;

    return {
      date,
      gross_revenue,
      ml_commission,
      shipping_cost,
      net_revenue,
      orders_count,
      avg_commission_rate,
      free_shipping_orders,
      free_shipping_cost: shipping_cost,
    };
  });

  return days;
}

export function getListingTypeBreakdown(
  storeId: string,
  daily: FinancialDailyStat[],
): ListingTypeStat[] {
  const rng = seededRandom(storeSeed(storeId, 8821));
  const totalOrders = daily.reduce((s, d) => s + d.orders_count, 0);
  const totalGross = daily.reduce((s, d) => s + d.gross_revenue, 0);

  const classic_pct = 0.52 + rng() * 0.08;
  const premium_pct = 0.33 + rng() * 0.08;
  const free_pct = 1 - classic_pct - premium_pct;

  return [
    {
      type: "classic",
      label: LISTING_TYPE_RATES.classic.label,
      rate: LISTING_TYPE_RATES.classic.rate,
      orders: Math.round(totalOrders * classic_pct),
      gross_revenue: Math.round(totalGross * classic_pct * 100) / 100,
      commission: Math.round(totalGross * classic_pct * LISTING_TYPE_RATES.classic.rate * 100) / 100,
    },
    {
      type: "premium",
      label: LISTING_TYPE_RATES.premium.label,
      rate: LISTING_TYPE_RATES.premium.rate,
      orders: Math.round(totalOrders * premium_pct),
      gross_revenue: Math.round(totalGross * premium_pct * 100) / 100,
      commission: Math.round(totalGross * premium_pct * LISTING_TYPE_RATES.premium.rate * 100) / 100,
    },
    {
      type: "free",
      label: LISTING_TYPE_RATES.free.label,
      rate: LISTING_TYPE_RATES.free.rate,
      orders: Math.round(totalOrders * free_pct),
      gross_revenue: Math.round(totalGross * free_pct * 100) / 100,
      commission: 0,
    },
  ];
}

export function getShippingBreakdown(daily: FinancialDailyStat[]): ShippingBreakdown {
  const total_shipped_orders = daily.reduce((s, d) => s + d.orders_count, 0);
  const free_shipping_orders = daily.reduce((s, d) => s + d.free_shipping_orders, 0);
  const total_shipping_cost = Math.round(daily.reduce((s, d) => s + d.shipping_cost, 0) * 100) / 100;
  return {
    total_shipped_orders,
    free_shipping_orders,
    free_shipping_pct: total_shipped_orders > 0
      ? Math.round((free_shipping_orders / total_shipped_orders) * 10000) / 100
      : 0,
    total_shipping_cost,
    avg_shipping_cost_per_order: free_shipping_orders > 0
      ? Math.round((total_shipping_cost / free_shipping_orders) * 100) / 100
      : 0,
    mercado_envios_cost: total_shipping_cost,
  };
}

export function computeFinancialSummary(daily: FinancialDailyStat[]): FinancialSummary {
  const gross_revenue = Math.round(daily.reduce((s, d) => s + d.gross_revenue, 0) * 100) / 100;
  const ml_commission = Math.round(daily.reduce((s, d) => s + d.ml_commission, 0) * 100) / 100;
  const shipping_cost = Math.round(daily.reduce((s, d) => s + d.shipping_cost, 0) * 100) / 100;
  const net_revenue = Math.round((gross_revenue - ml_commission - shipping_cost) * 100) / 100;
  const total_orders = daily.reduce((s, d) => s + d.orders_count, 0);
  const net_margin_pct = gross_revenue > 0
    ? Math.round((net_revenue / gross_revenue) * 10000) / 100
    : 0;
  const avg_commission_rate = gross_revenue > 0
    ? Math.round((ml_commission / gross_revenue) * 10000) / 100
    : 0;
  return { gross_revenue, ml_commission, shipping_cost, net_revenue, net_margin_pct, avg_commission_rate, total_orders };
}
