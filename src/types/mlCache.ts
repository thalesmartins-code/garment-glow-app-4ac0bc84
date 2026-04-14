/**
 * Single source of truth for ML cache row types.
 * Used by mlCacheService, useMLDataLoader, and components.
 */

export interface DailyRow {
  date: string;
  total_revenue: number;
  approved_revenue: number;
  qty_orders: number;
  units_sold: number;
  cancelled_orders: number;
  shipped_orders: number;
  unique_visits: number;
  unique_buyers: number;
  ml_user_id?: string;
}

export interface HourlyRow {
  date: string;
  hour: number;
  total_revenue: number;
  approved_revenue: number;
  qty_orders: number;
  units_sold?: number;
  ml_user_id?: string;
}

export interface ProductDailyRow {
  item_id: string;
  date: string;
  title: string;
  thumbnail: string | null;
  qty_sold: number;
  revenue: number;
  ml_user_id?: string;
}

export interface MLUserCacheRow {
  ml_user_id: number;
  nickname: string | null;
  country: string | null;
  permalink: string | null;
  active_listings: number;
}

/** Mapped row used by hooks and components (frontend-friendly names) */
export interface DailyBreakdown {
  date: string;
  total: number;
  approved: number;
  qty: number;
  units_sold: number;
  cancelled: number;
  shipped: number;
  unique_visits: number;
  unique_buyers: number;
}

export interface HourlyBreakdown {
  date: string;
  hour: number;
  total: number;
  approved: number;
  qty: number;
  ml_user_id?: string;
}

export interface MLUser {
  id: number;
  nickname: string;
  country: string;
  permalink: string;
}

export function mapDailyRow(row: DailyRow): DailyBreakdown {
  return {
    date: row.date,
    total: Number(row.total_revenue ?? 0),
    approved: Number(row.approved_revenue ?? 0),
    qty: Number(row.qty_orders ?? 0),
    units_sold: Number(row.units_sold ?? row.qty_orders ?? 0),
    cancelled: Number(row.cancelled_orders ?? 0),
    shipped: Number(row.shipped_orders ?? 0),
    unique_visits: Number(row.unique_visits ?? 0),
    unique_buyers: Number(row.unique_buyers ?? 0),
  };
}

export function mapHourlyRow(row: HourlyRow): HourlyBreakdown {
  return {
    date: row.date,
    hour: Number(row.hour ?? 0),
    total: Number(row.total_revenue ?? 0),
    approved: Number(row.approved_revenue ?? 0),
    qty: Number(row.qty_orders ?? 0),
    ml_user_id: row.ml_user_id ?? undefined,
  };
}
