import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const QuerySchema = z.object({
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ml_user_ids: z.array(z.string().min(1)).min(1),
  limit: z.number().int().min(1).max(200).optional().default(50),
  offset: z.number().int().min(0).max(10000).optional().default(0),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    // Parse and validate body
    const body = await req.json();
    const parsed = QuerySchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }

    const { date_from, date_to, ml_user_ids, limit, offset } = parsed.data;

    // Server-side aggregation query using RPC or direct query
    // Aggregate products by item_id across dates, returning top N by total revenue
    const { data, error } = await supabase
      .from("ml_product_daily_cache")
      .select("item_id, title, thumbnail, qty_sold, revenue, ml_user_id, date")
      .eq("user_id", userId)
      .in("ml_user_id", ml_user_ids)
      .gte("date", date_from)
      .lte("date", date_to)
      .order("revenue", { ascending: false })
      .range(offset, offset + limit * 30 - 1); // Fetch more rows to aggregate

    if (error) {
      console.error("Query error:", error);
      return jsonResponse({ error: "Database query failed" }, 500);
    }

    // Aggregate in-memory (server-side, not client-side)
    const aggMap: Record<string, {
      item_id: string;
      title: string;
      thumbnail: string | null;
      qty_sold: number;
      revenue: number;
      ml_user_id: string;
    }> = {};

    for (const row of data || []) {
      const key = row.item_id;
      if (!aggMap[key]) {
        aggMap[key] = {
          item_id: row.item_id,
          title: row.title || "",
          thumbnail: row.thumbnail,
          qty_sold: 0,
          revenue: 0,
          ml_user_id: row.ml_user_id || "",
        };
      }
      aggMap[key].qty_sold += Number(row.qty_sold || 0);
      aggMap[key].revenue += Number(row.revenue || 0);
    }

    const aggregated = Object.values(aggMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return jsonResponse({
      success: true,
      products: aggregated,
      total_raw_rows: (data || []).length,
      aggregated_count: aggregated.length,
    });
  } catch (err: any) {
    console.error("ml-products-aggregated error:", err);
    return jsonResponse({ error: err.message || "Internal error" }, 500);
  }
});
