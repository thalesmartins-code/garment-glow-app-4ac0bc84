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

async function fetchItemIdsByStatus(sellerId: number, status: string, accessToken: string): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;
  const PAGE_SIZE = 100;
  while (true) {
    const search = await mlFetch(
      `/users/${sellerId}/items/search?status=${status}&limit=${PAGE_SIZE}&offset=${offset}`,
      accessToken,
    );
    const results = search.results || [];
    ids.push(...results);
    const total = search.paging?.total || 0;
    offset += PAGE_SIZE;
    if (results.length < PAGE_SIZE || offset >= total || offset >= 10000) break;
  }
  return ids;
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let mlSellerId = seller_id;
    if (!mlSellerId) {
      const me = await mlFetch("/users/me", access_token);
      mlSellerId = me.id;
    }

    // Fetch active items
    const activeIds = await fetchItemIdsByStatus(mlSellerId, "active", access_token);

    // Fetch paused items separately (non-fatal — ML pauses listings when stock = 0)
    let pausedIds: string[] = [];
    try {
      pausedIds = await fetchItemIdsByStatus(mlSellerId, "paused", access_token);
    } catch (e) {
      console.warn("Could not fetch paused items (non-critical):", e);
    }

    const allItemIds = [...new Set([...activeIds, ...pausedIds])];
    console.log(`Found ${activeIds.length} active, ${pausedIds.length} paused = ${allItemIds.length} total items`);

    // Multi-get items in batches of 20
    const items: any[] = [];
    for (let i = 0; i < allItemIds.length; i += 20) {
      const batch = allItemIds.slice(i, i + 20);
      const idsParam = batch.join(",");
      const multiGet = await mlFetch(
        `/items?ids=${idsParam}&attributes=id,title,available_quantity,sold_quantity,price,currency_id,thumbnail,status,category_id,listing_type_id,health,variations,attributes,seller_custom_field`,
        access_token,
      );
      for (const entry of multiGet) {
        if (entry.code === 200 && entry.body) {
          const b = entry.body;
          const rawVariations: any[] = b.variations || [];
          const variations = rawVariations.map((v: any) => ({
            variation_id: String(v.id),
            attribute_combinations: (v.attribute_combinations || []).map((a: any) => ({
              id: a.id,
              name: a.name,
              value: a.value_name,
            })),
            available_quantity: v.available_quantity ?? 0,
            sold_quantity: v.sold_quantity ?? 0,
            price: v.price ?? b.price ?? 0,
            picture_id: v.picture_ids?.[0] ?? null,
          }));
          const brandAttr = (b.attributes || []).find((a: any) => a.id === "BRAND");
          const brand = brandAttr?.value_name || null;
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
            visits: 0,
            brand,
            has_variations: variations.length > 1,
            variations,
          });
        }
      }
    }

    // Fetch visits per item in batches of 50 (active only to save time)
    try {
      for (let i = 0; i < activeIds.length; i += 50) {
        const batch = activeIds.slice(i, i + 50);
        const idsParam = batch.join(",");
        const visitsData = await mlFetch(`/items/visits?ids=${idsParam}`, access_token);
        if (visitsData && typeof visitsData === "object") {
          for (const item of items) {
            if (visitsData[item.id] !== undefined) {
              item.visits = Number(visitsData[item.id]) || 0;
            }
          }
        }
      }
    } catch (visitErr) {
      console.error("Visits fetch error (non-critical):", visitErr);
    }

    items.sort((a, b) => a.available_quantity - b.available_quantity || b.sold_quantity - a.sold_quantity);

    const totalItems = items.length;
    const totalStock = items.reduce((s, i) => s + i.available_quantity, 0);
    const outOfStock = items.filter((i) => i.available_quantity === 0).length;
    const lowStock = items.filter((i) => i.available_quantity > 0 && i.available_quantity <= 5).length;

    return new Response(
      JSON.stringify({ items, summary: { totalItems, totalStock, outOfStock, lowStock } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("ml-inventory error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
