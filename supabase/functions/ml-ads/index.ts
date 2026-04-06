import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ML_API = "https://api.mercadolibre.com";

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

// ─── Fetch campaigns ──────────────────────────────────────────────────────────
interface MLCampaign {
  campaign_id: string;
  name: string;
  status: string;
  daily_budget: number;
  last_updated: string;
}

async function fetchCampaigns(userId: string, accessToken: string): Promise<MLCampaign[]> {
  try {
    const data = await mlFetch(
      `/advertising/campaigns?user_id=${userId}&status=active,paused,ended&limit=50`,
      accessToken,
    );
    return (data.results || data || []) as MLCampaign[];
  } catch (e) {
    console.error("fetchCampaigns error:", e);
    return [];
  }
}

// ─── Fetch product ads metrics report (daily) ─────────────────────────────────
interface MLAdMetric {
  date: string;
  impressions: number;
  clicks: number;
  cost: number; // spend in local currency
  orders_quantity?: number;
  orders_amount?: number; // attributed revenue
}

async function fetchDailyMetrics(
  userId: string,
  dateFrom: string,
  dateTo: string,
  accessToken: string,
): Promise<MLAdMetric[]> {
  try {
    // Try the metrics report endpoint
    const data = await mlFetch(
      `/advertising/product_ads/metrics/report?user_id=${userId}&date_from=${dateFrom}&date_to=${dateTo}&granularity=day`,
      accessToken,
    );
    return (data.results || data || []) as MLAdMetric[];
  } catch (e) {
    console.error("fetchDailyMetrics error:", e);
    // Fallback: try campaign-level metrics
    try {
      const data = await mlFetch(
        `/advertising/campaigns/metrics?user_id=${userId}&date_from=${dateFrom}&date_to=${dateTo}&granularity=day`,
        accessToken,
      );
      return (data.results || data || []) as MLAdMetric[];
    } catch (e2) {
      console.error("fetchDailyMetrics fallback error:", e2);
      return [];
    }
  }
}

// ─── Fetch product ads with metrics ───────────────────────────────────────────
interface MLProductAd {
  item_id: string;
  title: string;
  thumbnail: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  orders_quantity?: number;
  orders_amount?: number;
}

async function fetchProductAds(userId: string, accessToken: string): Promise<MLProductAd[]> {
  try {
    const data = await mlFetch(
      `/advertising/product_ads/search?user_id=${userId}&status=active&limit=20`,
      accessToken,
    );
    return (data.results || data || []) as MLProductAd[];
  } catch (e) {
    console.error("fetchProductAds error:", e);
    return [];
  }
}

// ─── Transform to app types ──────────────────────────────────────────────────

function transformDaily(metrics: MLAdMetric[]) {
  return metrics.map((m) => {
    const impressions = m.impressions || 0;
    const clicks = m.clicks || 0;
    const spend = m.cost || 0;
    const attributed_orders = m.orders_quantity || 0;
    const attributed_revenue = m.orders_amount || 0;
    const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
    const roas = spend > 0 ? Math.round((attributed_revenue / spend) * 100) / 100 : 0;
    return {
      date: (m.date || "").substring(0, 10),
      impressions,
      clicks,
      spend,
      attributed_revenue,
      attributed_orders,
      cpc,
      ctr,
      roas,
    };
  });
}

function transformCampaigns(campaigns: MLCampaign[]) {
  return campaigns.map((c) => ({
    id: c.campaign_id || "",
    name: c.name || "",
    status: (c.status || "active").toLowerCase() as "active" | "paused" | "ended",
    daily_budget: c.daily_budget || 0,
    // Campaign-level aggregate metrics are not always in the campaigns list endpoint
    impressions: 0,
    clicks: 0,
    spend: 0,
    attributed_revenue: 0,
    attributed_orders: 0,
    cpc: 0,
    ctr: 0,
    roas: 0,
  }));
}

function transformProducts(products: MLProductAd[]) {
  return products.map((p) => {
    const impressions = p.impressions || 0;
    const clicks = p.clicks || 0;
    const spend = p.cost || 0;
    const attributed_orders = p.orders_quantity || 0;
    const attributed_revenue = p.orders_amount || 0;
    const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
    const roas = spend > 0 ? Math.round((attributed_revenue / spend) * 100) / 100 : 0;
    return {
      item_id: p.item_id || "",
      title: p.title || "",
      thumbnail: p.thumbnail || null,
      impressions,
      clicks,
      spend,
      attributed_revenue,
      attributed_orders,
      cpc,
      ctr,
      roas,
    };
  });
}

function computeSummary(daily: ReturnType<typeof transformDaily>[number][]) {
  if (daily.length === 0) {
    return {
      total_impressions: 0, total_clicks: 0, total_spend: 0,
      total_attributed_revenue: 0, total_attributed_orders: 0,
      avg_cpc: 0, avg_ctr: 0, avg_roas: 0,
    };
  }
  const total_impressions = daily.reduce((s, d) => s + d.impressions, 0);
  const total_clicks = daily.reduce((s, d) => s + d.clicks, 0);
  const total_spend = Math.round(daily.reduce((s, d) => s + d.spend, 0) * 100) / 100;
  const total_attributed_revenue = Math.round(daily.reduce((s, d) => s + d.attributed_revenue, 0) * 100) / 100;
  const total_attributed_orders = daily.reduce((s, d) => s + d.attributed_orders, 0);
  const avg_cpc = total_clicks > 0 ? Math.round((total_spend / total_clicks) * 100) / 100 : 0;
  const avg_ctr = total_impressions > 0 ? Math.round((total_clicks / total_impressions) * 10000) / 100 : 0;
  const avg_roas = total_spend > 0 ? Math.round((total_attributed_revenue / total_spend) * 100) / 100 : 0;
  return { total_impressions, total_clicks, total_spend, total_attributed_revenue, total_attributed_orders, avg_cpc, avg_ctr, avg_roas };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    // Parse params
    const url = new URL(req.url);
    const mlUserId = url.searchParams.get("ml_user_id");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    if (!mlUserId) return jsonResponse({ error: "ml_user_id required" }, 400);
    if (!dateFrom || !dateTo) return jsonResponse({ error: "date_from and date_to required" }, 400);

    // Get access token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from("ml_tokens")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("ml_user_id", mlUserId)
      .single();

    if (tokenErr || !tokenRow?.access_token) {
      return jsonResponse({ error: "No ML token found for this store" }, 404);
    }

    const accessToken = tokenRow.access_token;

    // Fetch data in parallel
    const [rawDaily, rawCampaigns, rawProducts] = await Promise.all([
      fetchDailyMetrics(mlUserId, dateFrom, dateTo, accessToken),
      fetchCampaigns(mlUserId, accessToken),
      fetchProductAds(mlUserId, accessToken),
    ]);

    const daily = transformDaily(rawDaily);
    const campaigns = transformCampaigns(rawCampaigns);
    const products = transformProducts(rawProducts);
    const summary = computeSummary(daily);

    console.log(`ml-ads: user=${user.id} store=${mlUserId} daily=${daily.length} campaigns=${campaigns.length} products=${products.length}`);

    return jsonResponse({ daily, campaigns, products, summary });
  } catch (err) {
    console.error("ml-ads error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
