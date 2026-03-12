import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ML_API = "https://api.mercadolibre.com";

async function mlFetch(path: string, accessToken: string) {
  const res = await fetch(`${ML_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`ML API error [${path}]:`, data);
    throw new Error(data.message || `ML API error: ${res.status}`);
  }
  return data;
}

async function fetchOrdersChunk(
  sellerId: number,
  dateFrom: string,
  dateTo: string,
  accessToken: string,
  maxOrders = 5000
): Promise<any[]> {
  const PAGE_SIZE = 50;
  let allOrders: any[] = [];
  let offset = 0;

  while (offset < 10000 && allOrders.length < maxOrders) {
    const url = `/orders/search?seller=${sellerId}&order.date_created.from=${dateFrom}&order.date_created.to=${dateTo}&sort=date_desc&limit=${PAGE_SIZE}&offset=${offset}`;
    const data = await mlFetch(url, accessToken);
    const results = data.results || [];
    allOrders = allOrders.concat(results);
    const total = data.paging?.total || 0;
    offset += PAGE_SIZE;
    if (results.length < PAGE_SIZE || offset >= total) break;
  }

  return allOrders;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, days = 30, user_id, date_from, date_to } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: "Missing access_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create supabase admin client for cache writes
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get user info
    const user = await mlFetch("/users/me", access_token);
    const sellerId = user.id;

    // 2. Determine date range — either explicit or relative
    let rangeStart: Date;
    let rangeEnd: Date;

    if (date_from && date_to) {
      rangeStart = new Date(date_from);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(date_to);
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      const periodDays = Math.min(Math.max(Number(days) || 30, 1), 90);
      rangeEnd = new Date();
      rangeEnd.setHours(23, 59, 59, 999);
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - periodDays + 1);
      rangeStart.setHours(0, 0, 0, 0);
    }

    // Split into weekly chunks
    const CHUNK_DAYS = 7;
    const chunks: Array<{ from: string; to: string }> = [];
    const totalMs = rangeEnd.getTime() - rangeStart.getTime();
    const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));

    for (let d = 0; d < totalDays; d += CHUNK_DAYS) {
      const chunkStart = new Date(rangeStart);
      chunkStart.setDate(rangeStart.getDate() + d);
      chunkStart.setHours(0, 0, 0, 0);

      const chunkEnd = new Date(rangeStart);
      chunkEnd.setDate(rangeStart.getDate() + Math.min(d + CHUNK_DAYS - 1, totalDays - 1));
      chunkEnd.setHours(23, 59, 59, 999);

      if (chunkEnd > rangeEnd) chunkEnd.setTime(rangeEnd.getTime());

      chunks.push({
        from: chunkStart.toISOString(),
        to: chunkEnd.toISOString(),
      });
    }

    console.log(`Fetching orders from ${rangeStart.toISOString()} to ${rangeEnd.toISOString()} in ${chunks.length} chunks`);

    let allOrders: any[] = [];
    for (const chunk of chunks) {
      const chunkOrders = await fetchOrdersChunk(sellerId, chunk.from, chunk.to, access_token);
      allOrders = allOrders.concat(chunkOrders);
    }

    // Deduplicate by order ID
    const seen = new Set<number>();
    const orders = allOrders.filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    console.log(`Fetched ${orders.length} unique orders in ${chunks.length} chunks (period: ${periodDays} days)`);

    // 3. Aggregate metrics
    let totalRevenue = 0;
    let totalOrders = orders.length;
    let approvedRevenue = 0;
    let cancelledOrders = 0;
    let shippedOrders = 0;
    const dailySales: Record<string, { total: number; approved: number; qty: number; cancelled: number; shipped: number }> = {};

    for (const order of orders) {
      const amount = order.total_amount || 0;
      const date = order.date_created ? order.date_created.substring(0, 10) : null;
      const status = order.status;

      totalRevenue += amount;

      if (status === "paid" || status === "confirmed") {
        approvedRevenue += amount;
      }
      if (status === "cancelled") {
        cancelledOrders++;
      }
      if (order.shipping?.status === "shipped" || order.shipping?.status === "delivered") {
        shippedOrders++;
      }

      if (date) {
        if (!dailySales[date]) {
          dailySales[date] = { total: 0, approved: 0, qty: 0, cancelled: 0, shipped: 0 };
        }
        dailySales[date].total += amount;
        dailySales[date].qty += 1;
        if (status === "paid" || status === "confirmed") {
          dailySales[date].approved += amount;
        }
        if (status === "cancelled") {
          dailySales[date].cancelled += 1;
        }
        if (order.shipping?.status === "shipped" || order.shipping?.status === "delivered") {
          dailySales[date].shipped += 1;
        }
      }
    }

    // 4. Get active listings count
    let activeListings = 0;
    try {
      const itemsSearch = await mlFetch(
        `/users/${sellerId}/items/search?status=active&limit=0`,
        access_token
      );
      activeListings = itemsSearch.paging?.total || 0;
    } catch {
      // non-critical
    }

    // 5. Save to cache if user_id provided
    if (user_id) {
      try {
        // Upsert daily cache
        const dailyRows = Object.entries(dailySales).map(([date, data]) => ({
          user_id,
          date,
          total_revenue: data.total,
          approved_revenue: data.approved,
          qty_orders: data.qty,
          cancelled_orders: data.cancelled,
          shipped_orders: data.shipped,
          synced_at: new Date().toISOString(),
        }));

        if (dailyRows.length > 0) {
          const { error: cacheErr } = await supabaseAdmin
            .from("ml_daily_cache")
            .upsert(dailyRows, { onConflict: "user_id,date" });
          if (cacheErr) console.error("Cache upsert error:", cacheErr);
        }

        // Upsert user cache
        const { error: userCacheErr } = await supabaseAdmin
          .from("ml_user_cache")
          .upsert({
            user_id,
            ml_user_id: user.id,
            nickname: user.nickname,
            country: user.country_id,
            permalink: user.permalink,
            active_listings: activeListings,
            synced_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        if (userCacheErr) console.error("User cache upsert error:", userCacheErr);

        console.log(`Cache updated: ${dailyRows.length} daily rows, user cache saved`);
      } catch (cacheError) {
        console.error("Cache save error:", cacheError);
      }
    }

    // 6. Build daily breakdown
    const dailyBreakdown = Object.entries(dailySales)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const response = {
      success: true,
      user: {
        id: user.id,
        nickname: user.nickname,
        country: user.country_id,
        permalink: user.permalink,
      },
      metrics: {
        total_revenue: totalRevenue,
        approved_revenue: approvedRevenue,
        total_orders: totalOrders,
        cancelled_orders: cancelledOrders,
        shipped_orders: shippedOrders,
        active_listings: activeListings,
        avg_ticket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        period: `last_${periodDays}_days`,
      },
      daily_breakdown: dailyBreakdown,
      paging: { total: totalOrders, fetched: totalOrders },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("ML Integration error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
