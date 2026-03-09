import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAGALU_API = "https://api.magalu.com";

async function magaluFetch(path: string, accessToken: string) {
  const res = await fetch(`${MAGALU_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Magalu API error [${path}]:`, data);
    throw new Error(data.message || `Magalu API error: ${res.status}`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, action } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: "Missing access_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestAction = action || "dashboard";

    // Action: Get orders/sales data
    if (requestAction === "orders" || requestAction === "dashboard") {
      // Fetch recent orders
      const ordersData = await magaluFetch(
        "/v1/orders?_sort=-created_at&_limit=50",
        access_token
      );

      const orders = ordersData.results || ordersData || [];

      // Aggregate metrics
      let totalRevenue = 0;
      let totalOrders = Array.isArray(orders) ? orders.length : 0;
      let approvedRevenue = 0;
      let cancelledOrders = 0;
      let shippedOrders = 0;
      const dailySales: Record<string, { total: number; approved: number; qty: number }> = {};

      if (Array.isArray(orders)) {
        for (const order of orders) {
          const amount = order.total_amount || order.total || 0;
          const date = (order.created_at || order.date_created || "").substring(0, 10);
          const status = order.status;

          totalRevenue += amount;

          if (status === "paid" || status === "delivered" || status === "shipped" || status === "approved") {
            approvedRevenue += amount;
          }
          if (status === "cancelled" || status === "canceled") {
            cancelledOrders++;
          }
          if (status === "shipped" || status === "delivered") {
            shippedOrders++;
          }

          if (date) {
            if (!dailySales[date]) {
              dailySales[date] = { total: 0, approved: 0, qty: 0 };
            }
            dailySales[date].total += amount;
            dailySales[date].qty += 1;
            if (status === "paid" || status === "delivered" || status === "shipped" || status === "approved") {
              dailySales[date].approved += amount;
            }
          }
        }
      }

      const dailyBreakdown = Object.entries(dailySales)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => b.date.localeCompare(a.date));

      const response = {
        success: true,
        metrics: {
          total_revenue: totalRevenue,
          approved_revenue: approvedRevenue,
          total_orders: totalOrders,
          cancelled_orders: cancelledOrders,
          shipped_orders: shippedOrders,
          avg_ticket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          period: "recent",
        },
        daily_breakdown: dailyBreakdown,
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Get product listings
    if (requestAction === "products") {
      const productsData = await magaluFetch(
        "/v1/products?_limit=50",
        access_token
      );

      return new Response(
        JSON.stringify({
          success: true,
          products: productsData.results || productsData || [],
          paging: productsData.paging || {},
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: dashboard, orders, products" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Magalu Integration error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
