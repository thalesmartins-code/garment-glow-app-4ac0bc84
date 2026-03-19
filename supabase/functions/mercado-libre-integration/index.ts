import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ML_API = "https://api.mercadolibre.com";
const BRT_OFFSET_MS = -3 * 60 * 60 * 1000; // UTC-3

/** Convert an ISO date string to { date: "YYYY-MM-DD", hour: number } in BRT */
function toBRT(isoStr: string): { date: string; hour: number } {
  const utc = new Date(isoStr);
  const brt = new Date(utc.getTime() + BRT_OFFSET_MS);
  return {
    date: brt.toISOString().substring(0, 10),
    hour: brt.getUTCHours(),
  };
}

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
  maxOrders = 15000,
): Promise<any[]> {
  const PAGE_SIZE = 50;
  let allOrders: any[] = [];
  let offset = 0;

  while (offset < 10000 && allOrders.length < maxOrders) {
    // Usar date_created para consistência: buscamos e classificamos pelo mesmo campo
    const url = `/orders/search?seller=${sellerId}&order.date_created.from=${dateFrom}&order.date_created.to=${dateTo}&sort=date_desc&limit=${PAGE_SIZE}&offset=${offset}`;
    const data = await mlFetch(url, accessToken);
    const results = data.results || [];
    allOrders = allOrders.concat(results);
    const total = data.paging?.total || 0;
    offset += PAGE_SIZE;
    if (results.length < PAGE_SIZE || offset >= total) break;
  }

  // Log truncation warning if we couldn't fetch all orders
  if (offset >= 10000 || allOrders.length >= maxOrders) {
    console.warn(
      `⚠️ TRUNCATION: fetched ${allOrders.length} orders but paging may have more. offset=${offset}, maxOrders=${maxOrders}`,
    );
  }

  return allOrders;
}

async function fetchVisits(
  sellerId: number,
  dateFrom: string,
  dateTo: string,
  accessToken: string,
): Promise<Record<string, number>> {
  const visitsMap: Record<string, number> = {};
  try {
    const from = new Date(`${dateFrom}T00:00:00.000Z`);
    const to = new Date(`${dateTo}T00:00:00.000Z`);
    const diffMs = to.getTime() - from.getTime();
    const last = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const data = await mlFetch(
      `/users/${sellerId}/items_visits/time_window?last=${last}&unit=day&ending=${dateTo}`,
      accessToken,
    );

    if (data.results && Array.isArray(data.results)) {
      for (const entry of data.results) {
        if (entry.date && typeof entry.total === "number") {
          visitsMap[entry.date.substring(0, 10)] = entry.total;
        }
      }
    } else {
      console.log("Visits API returned no daily results");
    }
  } catch (err) {
    console.error("Visits API error (non-critical):", err);
  }
  return visitsMap;
}

function countUniqueBuyers(orders: any[]): Record<string, number> {
  const dailyBuyers: Record<string, Set<number>> = {};
  for (const order of orders) {
    const date = order.date_created ? order.date_created.substring(0, 10) : null;
    const buyerId = order.buyer?.id;
    if (date && buyerId) {
      if (!dailyBuyers[date]) dailyBuyers[date] = new Set();
      dailyBuyers[date].add(buyerId);
    }
  }
  const result: Record<string, number> = {};
  for (const [date, buyers] of Object.entries(dailyBuyers)) {
    result[date] = buyers.size;
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, days = 1, user_id, date_from, date_to } = await req.json();

    if (!access_token) {
      return new Response(JSON.stringify({ error: "Missing access_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const user = await mlFetch("/users/me", access_token);
    const sellerId = user.id;

    let rangeStart: Date;
    let rangeEnd: Date;
    let periodDays: number;

    if (date_from && date_to) {
      rangeStart = new Date(date_from);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(date_to);
      rangeEnd.setHours(23, 59, 59, 999);
      periodDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      periodDays = Math.min(Math.max(Number(days) || 30, 1), 90);
      rangeEnd = new Date();
      rangeEnd.setHours(23, 59, 59, 999);
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - periodDays + 1);
      rangeStart.setHours(0, 0, 0, 0);
    }

    const CHUNK_DAYS = 1;
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

    console.log(
      `Fetching orders from ${rangeStart.toISOString()} to ${rangeEnd.toISOString()} in ${chunks.length} chunks`,
    );

    let allOrders: any[] = [];
    for (const chunk of chunks) {
      const chunkOrders = await fetchOrdersChunk(sellerId, chunk.from, chunk.to, access_token);
      allOrders = allOrders.concat(chunkOrders);
    }

    const seen = new Set<number>();
    const orders = allOrders.filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    console.log(`Fetched ${orders.length} unique orders in ${chunks.length} chunks (period: ${periodDays} days)`);

    let totalRevenue = 0;
    const totalOrders = orders.length;
    let totalUnitsSold = 0;
    let approvedRevenue = 0;
    let cancelledOrders = 0;
    let shippedOrders = 0;
    const dailySales: Record<
      string,
      {
        total: number;
        approved: number;
        qty: number;
        units_sold: number;
        cancelled: number;
        shipped: number;
        unique_visits: number;
        unique_buyers: number;
      }
    > = {};
    const hourlySales: Record<
      string,
      { date: string; hour: number; total: number; approved: number; qty: number; units_sold: number }
    > = {};
    const productSales: Record<
      string,
      { item_id: string; date: string; title: string; thumbnail: string | null; qty_sold: number; revenue: number }
    > = {};

    for (const order of orders) {
      const amount = Number(order.total_amount || 0);
      const dateCreated = order.date_created || null;
      const date = dateCreated ? dateCreated.substring(0, 10) : null;
      const hour = dateCreated ? Number(dateCreated.substring(11, 13)) : null;
      const status = order.status;

      // Count units sold (each different product in a cart = 1 sale)
      const orderUnits =
        (order.order_items || []).reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0) || 1;

      totalRevenue += amount;
      totalUnitsSold += orderUnits;

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
          dailySales[date] = {
            total: 0,
            approved: 0,
            qty: 0,
            units_sold: 0,
            cancelled: 0,
            shipped: 0,
            unique_visits: 0,
            unique_buyers: 0,
          };
        }
        dailySales[date].total += amount;
        dailySales[date].qty += 1;
        dailySales[date].units_sold += orderUnits;
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

      if (date && hour !== null && Number.isFinite(hour)) {
        const hourlyKey = `${date}-${String(hour).padStart(2, "0")}`;
        if (!hourlySales[hourlyKey]) {
          hourlySales[hourlyKey] = { date, hour, total: 0, approved: 0, qty: 0, units_sold: 0 };
        }
        hourlySales[hourlyKey].total += amount;
        hourlySales[hourlyKey].qty += 1;
        hourlySales[hourlyKey].units_sold += orderUnits;
        if (status === "paid" || status === "confirmed") {
          hourlySales[hourlyKey].approved += amount;
        }
      }

      // Aggregate product-level sales per day
      if (date && order.order_items) {
        for (const item of order.order_items) {
          const itemId = item.item?.id;
          if (!itemId) continue;
          const prodKey = `${date}::${itemId}`;
          const itemQty = Number(item.quantity) || 1;
          const itemRevenue = Number(item.unit_price || 0) * itemQty;
          if (!productSales[prodKey]) {
            productSales[prodKey] = {
              item_id: itemId,
              date,
              title: item.item?.title || "",
              thumbnail: null,
              qty_sold: 0,
              revenue: 0,
            };
          }
          productSales[prodKey].qty_sold += itemQty;
          productSales[prodKey].revenue += itemRevenue;
        }
      }
    }

    // Enrich product thumbnails via multi-get
    try {
      const uniqueItemIds = [...new Set(Object.values(productSales).map((p) => p.item_id))];
      for (let i = 0; i < uniqueItemIds.length; i += 20) {
        const batch = uniqueItemIds.slice(i, i + 20);
        const idsParam = batch.join(",");
        const multiGet = await mlFetch(`/items?ids=${idsParam}&attributes=id,thumbnail`, access_token);
        for (const entry of multiGet) {
          if (entry.code === 200 && entry.body?.thumbnail) {
            for (const ps of Object.values(productSales)) {
              if (ps.item_id === entry.body.id) {
                ps.thumbnail = entry.body.thumbnail;
              }
            }
          }
        }
      }
      console.log(`Enriched thumbnails for ${uniqueItemIds.length} unique items`);
    } catch (thumbErr) {
      console.error("Thumbnail enrichment error (non-critical):", thumbErr);
    }

    const dailyBuyers = countUniqueBuyers(orders);
    for (const [date, count] of Object.entries(dailyBuyers)) {
      if (!dailySales[date]) {
        dailySales[date] = {
          total: 0,
          approved: 0,
          qty: 0,
          units_sold: 0,
          cancelled: 0,
          shipped: 0,
          unique_visits: 0,
          unique_buyers: 0,
        };
      }
      dailySales[date].unique_buyers = count;
    }
    const totalUniqueBuyers = new Set(orders.map((o) => o.buyer?.id).filter(Boolean)).size;

    const rangeFromStr = rangeStart.toISOString().substring(0, 10);
    const rangeToStr = rangeEnd.toISOString().substring(0, 10);
    const dailyVisits = await fetchVisits(sellerId, rangeFromStr, rangeToStr, access_token);
    let totalVisits = 0;
    for (const [date, visits] of Object.entries(dailyVisits)) {
      totalVisits += visits;
      if (!dailySales[date]) {
        dailySales[date] = {
          total: 0,
          approved: 0,
          qty: 0,
          units_sold: 0,
          cancelled: 0,
          shipped: 0,
          unique_visits: 0,
          unique_buyers: 0,
        };
      }
      dailySales[date].unique_visits = visits;
    }

    console.log(
      `Unique buyers: ${totalUniqueBuyers}, daily visit rows: ${Object.keys(dailyVisits).length}, total visits: ${totalVisits}`,
    );

    let activeListings = 0;
    try {
      const itemsSearch = await mlFetch(`/users/${sellerId}/items/search?status=active&limit=0`, access_token);
      activeListings = itemsSearch.paging?.total || 0;
    } catch {
      // non-critical
    }

    if (user_id) {
      try {
        const syncedAt = new Date().toISOString();
        const dailyRows = Object.entries(dailySales).map(([date, data]) => ({
          user_id,
          date,
          total_revenue: data.total,
          approved_revenue: data.approved,
          qty_orders: data.qty,
          units_sold: data.units_sold,
          cancelled_orders: data.cancelled,
          shipped_orders: data.shipped,
          unique_visits: data.unique_visits,
          unique_buyers: data.unique_buyers,
          synced_at: syncedAt,
        }));

        const hourlyRows = Object.values(hourlySales).map((data) => ({
          user_id,
          date: data.date,
          hour: data.hour,
          total_revenue: data.total,
          approved_revenue: data.approved,
          qty_orders: data.qty,
          units_sold: data.units_sold,
          synced_at: syncedAt,
        }));

        if (dailyRows.length > 0) {
          const { error: cacheErr } = await supabaseAdmin
            .from("ml_daily_cache")
            .upsert(dailyRows, { onConflict: "user_id,date" });
          if (cacheErr) console.error("Cache upsert error:", cacheErr);
        }

        if (hourlyRows.length > 0) {
          const { error: hourlyCacheErr } = await supabaseAdmin
            .from("ml_hourly_cache")
            .upsert(hourlyRows, { onConflict: "user_id,date,hour" });
          if (hourlyCacheErr) console.error("Hourly cache upsert error:", hourlyCacheErr);
        }

        // Upsert product daily cache
        const productRows = Object.values(productSales).map((p) => ({
          user_id,
          date: p.date,
          item_id: p.item_id,
          title: p.title,
          thumbnail: p.thumbnail,
          qty_sold: p.qty_sold,
          revenue: p.revenue,
          synced_at: syncedAt,
        }));

        if (productRows.length > 0) {
          // Fire-and-forget product cache upsert to avoid timeout
          (async () => {
            try {
              for (let i = 0; i < productRows.length; i += 200) {
                const batch = productRows.slice(i, i + 200);
                const { error: prodCacheErr } = await supabaseAdmin
                  .from("ml_product_daily_cache")
                  .upsert(batch, { onConflict: "user_id,date,item_id" });
                if (prodCacheErr) console.error("Product cache upsert error:", prodCacheErr);
              }
              console.log(`Product cache: ${productRows.length} rows saved`);
            } catch (e) {
              console.error("Product cache async error:", e);
            }
          })();
        }

        const { error: userCacheErr } = await supabaseAdmin.from("ml_user_cache").upsert(
          {
            user_id,
            ml_user_id: user.id,
            nickname: user.nickname,
            country: user.country_id,
            permalink: user.permalink,
            active_listings: activeListings,
            synced_at: syncedAt,
          },
          { onConflict: "user_id" },
        );
        if (userCacheErr) console.error("User cache upsert error:", userCacheErr);

        console.log(
          `Cache updated: ${dailyRows.length} daily rows, ${hourlyRows.length} hourly rows, ${productRows.length} product rows, user cache saved`,
        );
      } catch (cacheError) {
        console.error("Cache save error:", cacheError);
      }
    }

    const dailyBreakdown = Object.entries(dailySales)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const hourlyBreakdown = Object.values(hourlySales).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.hour - a.hour;
    });

    const conversionRate = totalVisits > 0 ? (totalUniqueBuyers / totalVisits) * 100 : 0;

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
        units_sold: totalUnitsSold,
        cancelled_orders: cancelledOrders,
        shipped_orders: shippedOrders,
        active_listings: activeListings,
        avg_ticket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        unique_visits: totalVisits,
        unique_buyers: totalUniqueBuyers,
        conversion_rate: conversionRate,
        period: `last_${periodDays}_days`,
      },
      daily_breakdown: dailyBreakdown,
      hourly_breakdown: hourlyBreakdown,
      paging: { total: totalOrders, fetched: totalOrders },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("ML Integration error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
