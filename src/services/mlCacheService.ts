import { supabase } from "@/integrations/supabase/client";
import type { DailyRow, HourlyRow, ProductDailyRow, MLUserCacheRow } from "@/types/mlCache";

// ── Fetch functions ────────────────────────────────────────────────────────────

export type { DailyRow, HourlyRow, ProductDailyRow, MLUserCacheRow };

export async function fetchDailyCache(
  userId: string,
  mlUserIds: string[],
  dateFrom: string,
  dateTo: string,
  selectedStore: string,
): Promise<DailyRow[]> {
  let query = supabase
    .from("ml_daily_cache")
    .select("*")
    .eq("user_id", userId)
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .order("date", { ascending: false })
    .limit(1000);

  if (selectedStore !== "all") {
    query = query.eq("ml_user_id", selectedStore);
  } else {
    query = query.in("ml_user_id", mlUserIds);
  }

  const { data } = await query;
  return (data || []) as DailyRow[];
}

export async function fetchHourlyCache(
  userId: string,
  mlUserIds: string[],
  selectedStore: string,
  targetDate: string | null,
): Promise<HourlyRow[]> {
  let query = supabase
    .from("ml_hourly_cache")
    .select("*")
    .eq("user_id", userId);

  if (selectedStore !== "all") {
    query = query.eq("ml_user_id", selectedStore);
  } else {
    query = query.in("ml_user_id", mlUserIds);
  }

  query = query
    .order("date", { ascending: false })
    .order("hour", { ascending: true });

  if (targetDate) {
    query = query.eq("date", targetDate).limit(24 * Math.max(mlUserIds.length, 1));
  } else {
    query = query.limit(1000);
  }

  const { data } = await query;
  return (data || []) as HourlyRow[];
}

export async function fetchProductDailyCache(
  userId: string,
  mlUserIds: string[],
  dateFrom: string,
  dateTo: string,
  selectedStore: string,
): Promise<ProductDailyRow[]> {
  let query = supabase
    .from("ml_product_daily_cache")
    .select("*")
    .eq("user_id", userId)
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .order("revenue", { ascending: false })
    .limit(5000);

  if (selectedStore !== "all") {
    query = query.eq("ml_user_id", selectedStore);
  } else {
    query = query.in("ml_user_id", mlUserIds);
  }

  const { data } = await query;
  return (data || []).map((r: any) => ({
    item_id: r.item_id,
    date: r.date,
    title: r.title || "",
    thumbnail: r.thumbnail,
    qty_sold: Number(r.qty_sold || 0),
    revenue: Number(r.revenue || 0),
    ml_user_id: r.ml_user_id,
  }));
}

export async function fetchUserCache(
  userId: string,
  mlUserIds: string[],
  selectedStore: string,
): Promise<MLUserCacheRow | null> {
  let query = supabase.from("ml_user_cache").select("*").eq("user_id", userId);
  if (selectedStore !== "all") {
    query = query.eq("ml_user_id", Number(selectedStore));
  } else if (mlUserIds.length > 0) {
    query = query.in("ml_user_id", mlUserIds.map(Number));
  }

  const { data } = await query.maybeSingle();
  return data as MLUserCacheRow | null;
}

// ── Sync (Edge Function invocation) ────────────────────────────────────────────

export async function syncMLData(params: {
  mlUserId: string;
  dateFrom: string;
  dateTo: string;
  sellerId: string | null;
}) {
  const { data, error } = await supabase.functions.invoke("mercado-libre-integration", {
    body: {
      ml_user_id: params.mlUserId,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      seller_id: params.sellerId,
    },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "Sync failed");
  return data;
}

export async function fetchInventory(mlUserId: string) {
  const { data, error } = await supabase.functions.invoke("ml-inventory", {
    body: { ml_user_id: mlUserId },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── Upsert (frontend → DB, used by saveToCache) ──────────────────────────────

export async function upsertDailyCache(
  userId: string,
  mlUserIdStr: string,
  dailyRows: Array<{
    date: string;
    total: number;
    approved: number;
    qty: number;
    cancelled: number;
    shipped: number;
    unique_visits: number;
    unique_buyers: number;
  }>,
) {
  const syncedAt = new Date().toISOString();
  const rows = dailyRows.map((d) => ({
    user_id: userId,
    ml_user_id: mlUserIdStr,
    date: d.date,
    total_revenue: d.total,
    approved_revenue: d.approved,
    qty_orders: d.qty,
    cancelled_orders: d.cancelled || 0,
    shipped_orders: d.shipped || 0,
    unique_visits: d.unique_visits || 0,
    unique_buyers: d.unique_buyers || 0,
    synced_at: syncedAt,
  }));

  for (let i = 0; i < rows.length; i += 200) {
    await supabase
      .from("ml_daily_cache")
      .upsert(rows.slice(i, i + 200), { onConflict: "user_id,ml_user_id,date" });
  }
}

export async function upsertSyncLog(
  userId: string,
  mlUserId: string,
  dateFrom: string,
  dateTo: string,
  daysCount: number,
) {
  const now = new Date().toISOString();
  await supabase.from("ml_sync_log").upsert(
    {
      user_id: userId,
      ml_user_id: mlUserId,
      date_from: dateFrom,
      date_to: dateTo,
      days_synced: daysCount,
      source: "auto",
      synced_at: now,
    },
    { onConflict: "user_id,ml_user_id,date_from,date_to,source" },
  );
}
