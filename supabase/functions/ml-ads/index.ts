import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ML_API = "https://api.mercadolibre.com";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function mlFetch(path: string, accessToken: string) {
  const res = await fetch(`${ML_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`ML Ads API error [${path}]:`, data);
    throw new Error(data.message || `ML API error: ${res.status}`);
  }
  return data;
}

// ─── Fetch from ML API ────────────────────────────────────────────────────────

async function fetchCampaigns(userId: string, accessToken: string) {
  try {
    const data = await mlFetch(
      `/advertising/campaigns?user_id=${userId}&status=active,paused,ended&limit=50`,
      accessToken,
    );
    return (data.results || data || []);
  } catch (e) {
    console.error("fetchCampaigns error:", e);
    return [];
  }
}

// Fetch ALL pages from a ML Ads metrics endpoint and aggregate by date
async function fetchAllMetricPages(
  baseUrl: string,
  accessToken: string,
  pageSize = 1000,
): Promise<any[]> {
  const allRows: any[] = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    const data: any = await mlFetch(`${baseUrl}${sep}limit=${pageSize}&offset=${offset}`, accessToken);
    const rows: any[] = data.results ?? data.data ?? (Array.isArray(data) ? data : []);
    allRows.push(...rows);
    total = data.paging?.total ?? rows.length + offset; // stop if no paging info
    offset += rows.length;
    if (rows.length === 0) break; // safety
    console.log(`[ml-ads] page offset=${offset - rows.length} rows=${rows.length} total=${total}`);
  }
  return allRows;
}

// Aggregate per-item-per-day rows into daily totals
function aggregateByDate(rows: any[]): any[] {
  const map = new Map<string, any>();
  for (const m of rows) {
    const date = (m.date || "").substring(0, 10);
    if (!date) continue;
    const existing = map.get(date);
    const impressions        = m.print_count        ?? m.impressions     ?? 0;
    const clicks             = m.click_count        ?? m.clicks          ?? 0;
    const spend              = m.cost               ?? m.investment      ?? 0;
    const attributed_orders  = m.converted_quantity ?? m.orders_quantity ?? 0;
    const attributed_revenue = m.converted_amount   ?? m.orders_amount   ?? 0;
    if (existing) {
      existing.impressions        += impressions;
      existing.clicks             += clicks;
      existing.spend              += spend;
      existing.attributed_orders  += attributed_orders;
      existing.attributed_revenue += attributed_revenue;
    } else {
      map.set(date, { date, impressions, clicks, spend, attributed_orders, attributed_revenue });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchDailyMetrics(userId: string, dateFrom: string, dateTo: string, accessToken: string): Promise<{ rows: any[]; accessible: boolean }> {
  // Try seller_id param first (paginated)
  try {
    const rows = await fetchAllMetricPages(
      `/advertising/product_ads/metrics?seller_id=${userId}&date_from=${dateFrom}&date_to=${dateTo}&granularity=DAY`,
      accessToken,
    );
    console.log(`[ml-ads] primary (seller_id) total rows fetched: ${rows.length}`);
    if (rows.length > 0) return { rows: aggregateByDate(rows), accessible: true };
  } catch (e) { console.warn("[ml-ads] primary failed:", String(e)); }

  // Fallback: user_id param
  try {
    const rows = await fetchAllMetricPages(
      `/advertising/product_ads/metrics?user_id=${userId}&date_from=${dateFrom}&date_to=${dateTo}&granularity=DAY`,
      accessToken,
    );
    console.log(`[ml-ads] fb1 (user_id) total rows fetched: ${rows.length}`);
    if (rows.length > 0) return { rows: aggregateByDate(rows), accessible: true };
  } catch (e) { console.warn("[ml-ads] fb1 failed:", String(e)); }

  // Fallback: campaigns/metrics
  try {
    const rows = await fetchAllMetricPages(
      `/advertising/campaigns/metrics?seller_id=${userId}&date_from=${dateFrom}&date_to=${dateTo}&granularity=DAY`,
      accessToken,
    );
    // API accessible — just 0 rows for this period
    return { rows: aggregateByDate(rows), accessible: true };
  } catch (e) {
    const msg = String(e);
    console.warn("[ml-ads] all daily metrics attempts failed:", msg);
    // 404 / 403 = ads not available on this account or app scope missing
    const notAvailable = /404|resource not found|not found|403|forbidden/i.test(msg);
    console.log(`[ml-ads] adsAvailable=${!notAvailable}`);
    return { rows: [], accessible: !notAvailable };
  }
}

async function fetchProductAds(userId: string, accessToken: string) {
  try {
    const data = await mlFetch(
      `/advertising/product_ads/search?user_id=${userId}&status=active&limit=20`,
      accessToken,
    );
    return (data.results || data || []);
  } catch (e) {
    console.error("fetchProductAds error:", e);
    return [];
  }
}

// ─── Transform helpers ────────────────────────────────────────────────────────

function calcMetrics(impressions: number, clicks: number, spend: number, orders: number, revenue: number) {
  const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
  const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
  const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0;
  return { cpc, ctr, roas };
}

// transformDaily receives already-aggregated rows from aggregateByDate
function transformDaily(metrics: any[]) {
  return metrics.map((m: any) => {
    const impressions        = m.impressions        ?? 0;
    const clicks             = m.clicks             ?? 0;
    const spend              = m.spend              ?? 0;
    const attributed_orders  = m.attributed_orders  ?? 0;
    const attributed_revenue = m.attributed_revenue ?? 0;
    const { cpc, ctr, roas } = calcMetrics(impressions, clicks, spend, attributed_orders, attributed_revenue);
    return {
      date: (m.date || "").substring(0, 10),
      impressions, clicks, spend, attributed_revenue, attributed_orders, cpc, ctr, roas,
    };
  });
}

function transformCampaigns(campaigns: any[]) {
  return campaigns.map((c: any) => {
    const impressions = c.impressions || 0;
    const clicks = c.clicks || 0;
    const spend = c.cost || c.spend || 0;
    const attributed_orders = c.orders_quantity || 0;
    const attributed_revenue = c.orders_amount || 0;
    const { cpc, ctr, roas } = calcMetrics(impressions, clicks, spend, attributed_orders, attributed_revenue);
    return {
      campaign_id: c.campaign_id || c.id || "",
      name: c.name || "",
      status: (c.status || "active").toLowerCase(),
      daily_budget: c.daily_budget || 0,
      impressions, clicks, spend, attributed_revenue, attributed_orders, cpc, ctr, roas,
    };
  });
}

function transformProducts(products: any[]) {
  return products.map((p: any) => {
    const impressions = p.impressions || 0;
    const clicks = p.clicks || 0;
    const spend = p.cost || 0;
    const attributed_orders = p.orders_quantity || 0;
    const attributed_revenue = p.orders_amount || 0;
    const { cpc, ctr, roas } = calcMetrics(impressions, clicks, spend, attributed_orders, attributed_revenue);
    return {
      item_id: p.item_id || "",
      title: p.title || "",
      thumbnail: p.thumbnail || null,
      impressions, clicks, spend, attributed_revenue, attributed_orders, cpc, ctr, roas,
    };
  });
}

function computeSummary(daily: any[]) {
  if (daily.length === 0) {
    return {
      total_impressions: 0, total_clicks: 0, total_spend: 0,
      total_attributed_revenue: 0, total_attributed_orders: 0,
      avg_cpc: 0, avg_ctr: 0, avg_roas: 0,
    };
  }
  const total_impressions = daily.reduce((s: number, d: any) => s + d.impressions, 0);
  const total_clicks = daily.reduce((s: number, d: any) => s + d.clicks, 0);
  const total_spend = Math.round(daily.reduce((s: number, d: any) => s + d.spend, 0) * 100) / 100;
  const total_attributed_revenue = Math.round(daily.reduce((s: number, d: any) => s + d.attributed_revenue, 0) * 100) / 100;
  const total_attributed_orders = daily.reduce((s: number, d: any) => s + d.attributed_orders, 0);
  const { cpc: avg_cpc, ctr: avg_ctr, roas: avg_roas } = calcMetrics(total_impressions, total_clicks, total_spend, total_attributed_orders, total_attributed_revenue);
  return { total_impressions, total_clicks, total_spend, total_attributed_revenue, total_attributed_orders, avg_cpc, avg_ctr, avg_roas };
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function loadCachedDaily(supabase: any, userId: string, mlUserId: string, dateFrom: string, dateTo: string) {
  const { data } = await supabase
    .from("ml_ads_daily_cache")
    .select("*")
    .eq("user_id", userId)
    .eq("ml_user_id", mlUserId)
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .order("date");
  return data || [];
}

async function loadCachedCampaigns(supabase: any, userId: string, mlUserId: string) {
  const { data } = await supabase
    .from("ml_ads_campaigns_cache")
    .select("*")
    .eq("user_id", userId)
    .eq("ml_user_id", mlUserId);
  return data || [];
}

async function loadCachedProducts(supabase: any, userId: string, mlUserId: string) {
  const { data } = await supabase
    .from("ml_ads_products_cache")
    .select("*")
    .eq("user_id", userId)
    .eq("ml_user_id", mlUserId);
  return data || [];
}

function isCacheFresh(rows: any[]): boolean {
  if (rows.length === 0) return false;
  const latest = rows.reduce((max: string, r: any) => r.synced_at > max ? r.synced_at : max, rows[0].synced_at);
  return (Date.now() - new Date(latest).getTime()) < CACHE_TTL_MS;
}

async function upsertDailyCache(supabase: any, userId: string, mlUserId: string, daily: any[]) {
  if (daily.length === 0) return;
  const rows = daily.map((d: any) => ({
    user_id: userId,
    ml_user_id: mlUserId,
    date: d.date,
    impressions: d.impressions,
    clicks: d.clicks,
    spend: d.spend,
    attributed_revenue: d.attributed_revenue,
    attributed_orders: d.attributed_orders,
    cpc: d.cpc,
    ctr: d.ctr,
    roas: d.roas,
    synced_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("ml_ads_daily_cache").upsert(rows, {
    onConflict: "user_id,ml_user_id,date",
  });
  if (error) console.error("upsertDailyCache error:", error);
}

async function upsertCampaignsCache(supabase: any, userId: string, mlUserId: string, campaigns: any[]) {
  if (campaigns.length === 0) return;
  const rows = campaigns.map((c: any) => ({
    user_id: userId,
    ml_user_id: mlUserId,
    campaign_id: c.campaign_id,
    name: c.name,
    status: c.status,
    daily_budget: c.daily_budget,
    impressions: c.impressions,
    clicks: c.clicks,
    spend: c.spend,
    attributed_revenue: c.attributed_revenue,
    attributed_orders: c.attributed_orders,
    cpc: c.cpc,
    ctr: c.ctr,
    roas: c.roas,
    synced_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("ml_ads_campaigns_cache").upsert(rows, {
    onConflict: "user_id,ml_user_id,campaign_id",
  });
  if (error) console.error("upsertCampaignsCache error:", error);
}

async function upsertProductsCache(supabase: any, userId: string, mlUserId: string, products: any[]) {
  if (products.length === 0) return;
  const rows = products.map((p: any) => ({
    user_id: userId,
    ml_user_id: mlUserId,
    item_id: p.item_id,
    title: p.title,
    thumbnail: p.thumbnail,
    impressions: p.impressions,
    clicks: p.clicks,
    spend: p.spend,
    attributed_revenue: p.attributed_revenue,
    attributed_orders: p.attributed_orders,
    cpc: p.cpc,
    ctr: p.ctr,
    roas: p.roas,
    synced_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("ml_ads_products_cache").upsert(rows, {
    onConflict: "user_id,ml_user_id,item_id",
  });
  if (error) console.error("upsertProductsCache error:", error);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase   = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const url       = new URL(req.url);

    const QuerySchema = z.object({
      ml_user_id: z.string().min(1, "ml_user_id required"),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date_from format"),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date_to format"),
      force: z.string().optional(),
    });

    const parsed = QuerySchema.safeParse({
      ml_user_id: url.searchParams.get("ml_user_id"),
      date_from: url.searchParams.get("date_from"),
      date_to: url.searchParams.get("date_to"),
      force: url.searchParams.get("force") ?? undefined,
    });

    if (!parsed.success) {
      return jsonResponse({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }

    const { ml_user_id: mlUserId, date_from: dateFrom, date_to: dateTo, force } = parsed.data;
    const forceSync = force === "true";

    console.log(`[ml-ads] store=${mlUserId} from=${dateFrom} to=${dateTo}`);

    const { data: tokenRow, error: tokenErr } = await supabase
      .from("ml_tokens")
      .select("access_token, user_id")
      .eq("ml_user_id", mlUserId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenErr || !tokenRow?.access_token) {
      console.error("[ml-ads] token lookup failed:", tokenErr?.message);
      return jsonResponse({ error: "No ML token found for this store" }, 404);
    }

    const accessToken = tokenRow.access_token as string;
    const userId      = tokenRow.user_id      as string;

    if (!forceSync) {
      const [cachedDaily, cachedCampaigns, cachedProducts] = await Promise.all([
        loadCachedDaily(supabase, userId, mlUserId, dateFrom, dateTo),
        loadCachedCampaigns(supabase, userId, mlUserId),
        loadCachedProducts(supabase, userId, mlUserId),
      ]);
      if (isCacheFresh(cachedDaily) && cachedDaily.length > 0) {
        console.log(`[ml-ads] cache hit: ${cachedDaily.length} rows`);
        return jsonResponse({ daily: cachedDaily, campaigns: cachedCampaigns,
          products: cachedProducts, summary: computeSummary(cachedDaily), source: "cache" });
      }
    }

    const [{ rows: rawDaily, accessible: adsAvailable }, rawCampaigns, rawProducts] = await Promise.all([
      fetchDailyMetrics(mlUserId, dateFrom, dateTo, accessToken),
      fetchCampaigns(mlUserId, accessToken),
      fetchProductAds(mlUserId, accessToken),
    ]);

    console.log(`[ml-ads] raw: daily=${rawDaily.length} campaigns=${rawCampaigns.length} adsAvailable=${adsAvailable}`);
    if (rawDaily.length > 0) console.log("[ml-ads] rawDaily[0]:", JSON.stringify(rawDaily[0]).substring(0, 300));

    const daily     = transformDaily(rawDaily);
    const campaigns = transformCampaigns(rawCampaigns);
    const products  = transformProducts(rawProducts);
    const summary   = computeSummary(daily);

    console.log(`[ml-ads] transformed: daily=${daily.length}`);
    if (daily.length > 0) console.log("[ml-ads] summary:", JSON.stringify(summary));

    await Promise.all([
      upsertDailyCache(supabase, userId, mlUserId, daily),
      upsertCampaignsCache(supabase, userId, mlUserId, campaigns),
      upsertProductsCache(supabase, userId, mlUserId, products),
    ]).catch(err => console.error("[ml-ads] cache error:", err));

    return jsonResponse({ daily, campaigns, products, summary, adsAvailable, source: "api" });
  } catch (err) {
    console.error("ml-ads error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
