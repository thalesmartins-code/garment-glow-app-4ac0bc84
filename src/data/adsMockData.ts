import { format, subDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdsCampaign {
  id: string;
  name: string;
  status: "active" | "paused" | "ended";
  daily_budget: number;
  impressions: number;
  clicks: number;
  spend: number;
  attributed_revenue: number;
  attributed_orders: number;
  cpc: number;
  ctr: number;
  roas: number;
}

export interface AdsDailyStat {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  attributed_revenue: number;
  attributed_orders: number;
  cpc: number;
  ctr: number;
  roas: number;
}

export interface AdsProductStat {
  item_id: string;
  title: string;
  thumbnail: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  attributed_revenue: number;
  attributed_orders: number;
  cpc: number;
  ctr: number;
  roas: number;
}

export interface AdsSummary {
  total_impressions: number;
  total_clicks: number;
  total_spend: number;
  total_attributed_revenue: number;
  total_attributed_orders: number;
  avg_cpc: number;
  avg_ctr: number;
  avg_roas: number;
}

// ─── Seeded PRNG ──────────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  return h & 0x7fffffff;
}

function storeSeed(storeId: string, extra: number): number {
  return (hashString(storeId) ^ extra) & 0x7fffffff || 1;
}

// ─── Campaign templates ───────────────────────────────────────────────────────

const CAMPAIGN_TEMPLATES = [
  { name: "Performance - Tênis Running", budget: 80 },
  { name: "Vestuário Feminino Premium", budget: 120 },
  { name: "Acessórios Esportivos", budget: 60 },
  { name: "Calçados Masculinos", budget: 100 },
  { name: "Campanha Geral - Portfólio", budget: 200 },
  { name: "Roupas Fitness & Academia", budget: 90 },
];

const CAMPAIGN_STATUSES: Array<AdsCampaign["status"]> = ["active", "active", "active", "paused", "ended", "active"];

const PRODUCT_TITLES = [
  "Tênis Nike Air Max 270 Masculino",
  "Camiseta Polo Ralph Lauren",
  "Shorts Academia Dry Fit Masculino",
  "Legging Cintura Alta Feminina",
  "Jaqueta Corta-Vento Impermeável",
  "Tênis Vans Old Skool",
  "Bermuda Cargo Masculina",
  "Blusa Cropped Feminina",
  "Casaco Moletom Com Capuz",
  "Calça Jeans Slim Fit Masculina",
];

const THUMBNAILS = [
  "https://cdn.dummyjson.com/product-images/mens-shoes/black-sneakers-shoes/thumbnail.webp",
  "https://cdn.dummyjson.com/product-images/mens-shirts/grey-polo-shirt/thumbnail.webp",
  "https://cdn.dummyjson.com/product-images/mens-shirts/blue-dress-slim-fit-shirt/thumbnail.webp",
  "https://cdn.dummyjson.com/product-images/womens-shoes/flatforms-shoes/thumbnail.webp",
  "https://cdn.dummyjson.com/product-images/mens-shirts/black-t-shirts/thumbnail.webp",
  "https://cdn.dummyjson.com/product-images/mens-shoes/black-sneakers-shoes/thumbnail.webp",
  "https://cdn.dummyjson.com/product-images/mens-shirts/blue-dress-slim-fit-shirt/thumbnail.webp",
  "https://cdn.dummyjson.com/product-images/tops/blue-womens-handbag/thumbnail.webp",
  "https://cdn.dummyjson.com/product-images/mens-shirts/black-t-shirts/thumbnail.webp",
  "https://cdn.dummyjson.com/product-images/mens-shirts/grey-polo-shirt/thumbnail.webp",
];

// ─── Generators ───────────────────────────────────────────────────────────────

export function getMockAdsDailyStats(storeId: string, daysBack: number): AdsDailyStat[] {
  const rng = seededRandom(storeSeed(storeId, 9901));
  const today = new Date();

  return Array.from({ length: daysBack }, (_, i) => {
    const date = format(subDays(today, daysBack - 1 - i), "yyyy-MM-dd");
    const impressions = Math.floor(rng() * 3000 + 800);
    const clicks = Math.floor(impressions * (rng() * 0.04 + 0.01)); // CTR 1–5%
    const spend = Math.round(clicks * (rng() * 1.5 + 0.5) * 100) / 100; // CPC R$0.50–R$2.00
    const conv_rate = rng() * 0.06 + 0.02; // 2–8% conversion
    const attributed_orders = Math.floor(clicks * conv_rate);
    const avg_ticket = rng() * 180 + 80; // R$80–R$260
    const attributed_revenue = Math.round(attributed_orders * avg_ticket * 100) / 100;
    const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
    const roas = spend > 0 ? Math.round((attributed_revenue / spend) * 100) / 100 : 0;

    return { date, impressions, clicks, spend, attributed_revenue, attributed_orders, cpc, ctr, roas };
  });
}

export function getMockAdsCampaigns(storeId: string): AdsCampaign[] {
  const rng = seededRandom(storeSeed(storeId, 4421));
  const count = Math.floor(rng() * 2) + 4; // 4–5 campaigns

  return CAMPAIGN_TEMPLATES.slice(0, count).map((tmpl, i) => {
    const impressions = Math.floor(rng() * 25000 + 5000);
    const clicks = Math.floor(impressions * (rng() * 0.04 + 0.01));
    const spend = Math.round(clicks * (rng() * 1.5 + 0.5) * 100) / 100;
    const attributed_orders = Math.floor(clicks * (rng() * 0.06 + 0.02));
    const avg_ticket = rng() * 180 + 80;
    const attributed_revenue = Math.round(attributed_orders * avg_ticket * 100) / 100;
    const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
    const roas = spend > 0 ? Math.round((attributed_revenue / spend) * 100) / 100 : 0;

    return {
      id: `${storeId.slice(-4)}-camp-${i + 1}`,
      name: tmpl.name,
      status: CAMPAIGN_STATUSES[i] as AdsCampaign["status"],
      daily_budget: tmpl.budget,
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

export function getMockAdsProducts(storeId: string): AdsProductStat[] {
  const rng = seededRandom(storeSeed(storeId, 7753));

  return PRODUCT_TITLES.map((title, i) => {
    const impressions = Math.floor(rng() * 8000 + 1000);
    const clicks = Math.floor(impressions * (rng() * 0.05 + 0.01));
    const spend = Math.round(clicks * (rng() * 1.8 + 0.4) * 100) / 100;
    const attributed_orders = Math.floor(clicks * (rng() * 0.08 + 0.01));
    const avg_ticket = rng() * 200 + 60;
    const attributed_revenue = Math.round(attributed_orders * avg_ticket * 100) / 100;
    const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
    const roas = spend > 0 ? Math.round((attributed_revenue / spend) * 100) / 100 : 0;

    return {
      item_id: `ML${String(1000 + i)}`,
      title,
      thumbnail: THUMBNAILS[i] ?? null,
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

export function computeAdsSummary(daily: AdsDailyStat[]): AdsSummary {
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
