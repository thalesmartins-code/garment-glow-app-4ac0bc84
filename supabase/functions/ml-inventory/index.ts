import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ML_API = "https://api.mercadolibre.com";

async function mlFetch(path: string, accessToken: string) {
  const res = await fetch(`${ML_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`ML API error [${path}]:`, data);
    throw new Error(data.message || `ML API error: ${res.status}`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, seller_id } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: "access_token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Get seller_id from /users/me if not provided
    let mlSellerId = seller_id;
    if (!mlSellerId) {
      const me = await mlFetch("/users/me", access_token);
      mlSellerId = me.id;
    }

    // 2. Fetch all active item IDs with pagination
    const allItemIds: string[] = [];
    let offset = 0;
    const PAGE_SIZE = 100;
    while (true) {
      const search = await mlFetch(
        `/users/${mlSellerId}/items/search?status=active&limit=${PAGE_SIZE}&offset=${offset}`,
        access_token
      );
      const ids = search.results || [];
      allItemIds.push(...ids);
      const total = search.paging?.total || 0;
      offset += PAGE_SIZE;
      if (ids.length < PAGE_SIZE || offset >= total) break;
      if (offset >= 10000) break; // ML API limit
    }

    console.log(`Found ${allItemIds.length} active items for seller ${mlSellerId}`);

    // 3. Multi-get items in batches of 20
    const items: any[] = [];
    for (let i = 0; i < allItemIds.length; i += 20) {
      const batch = allItemIds.slice(i, i + 20);
      const idsParam = batch.join(",");
      const multiGet = await mlFetch(
        `/items?ids=${idsParam}&attributes=id,title,available_quantity,sold_quantity,price,currency_id,thumbnail,status,category_id,listing_type_id,health`,
        access_token
      );
      for (const entry of multiGet) {
        if (entry.code === 200 && entry.body) {
          const b = entry.body;
          items.push({
            id: b.id,
            title: b.title,
            available_quantity: b.available_quantity ?? 0,
            sold_quantity: b.sold_quantity ?? 0,
            price: b.price ?? 0,
            currency_id: b.currency_id ?? "BRL",
            thumbnail: b.thumbnail ?? null,
            status: b.status ?? "unknown",
            category_id: b.category_id ?? null,
            listing_type_id: b.listing_type_id ?? null,
            health: b.health ?? null,
          });
        }
      }
    }

    // 4. Sort: low stock first (available_quantity ascending), then by sold_quantity descending
    items.sort((a, b) => a.available_quantity - b.available_quantity || b.sold_quantity - a.sold_quantity);

    // 5. Summary stats
    const totalItems = items.length;
    const totalStock = items.reduce((s, i) => s + i.available_quantity, 0);
    const outOfStock = items.filter((i) => i.available_quantity === 0).length;
    const lowStock = items.filter((i) => i.available_quantity > 0 && i.available_quantity <= 5).length;

    return new Response(
      JSON.stringify({
        items,
        summary: { totalItems, totalStock, outOfStock, lowStock },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ml-inventory error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
