import { format, subDays } from "date-fns";
import type { MockInventoryItem } from "./marketplaceMockData";

// ─── Shared interfaces (same shape as marketplaceMockData) ────────────────────

export interface DailyBreakdown {
  date: string;
  total: number;
  approved: number;
  qty: number;
  units_sold: number;
  cancelled: number;
  shipped: number;
  unique_visits: number;
  unique_buyers: number;
}

export interface HourlyBreakdown {
  date: string;
  hour: number;
  total: number;
  approved: number;
  qty: number;
}

export interface ProductSalesRow {
  item_id: string;
  title: string;
  thumbnail: string | null;
  qty_sold: number;
  revenue: number;
  available_quantity?: number;
}

export interface MockInventorySummary {
  totalItems: number;
  totalStock: number;
  outOfStock: number;
  lowStock: number;
}

// ─── Seeded PRNG ──────────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = (seed >>> 0) || 1; // ensure positive 32-bit int
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Simple djb2-style string hash → 31-bit positive int */
function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h & 0x7fffffff; // ensure positive
}

/** Combine storeId hash with a base marketplace seed */
function storeSeed(storeId: string, baseSeed: number): number {
  return (hashString(storeId) ^ baseSeed) & 0x7fffffff || 1;
}

// ─── Marketplace profiles ─────────────────────────────────────────────────────

const MARKETPLACE_PROFILES: Record<
  string,
  {
    baseSeed: number;
    orders: [number, number];
    ticket: [number, number];
    inventoryCount: number;
    currency: string;
  }
> = {
  ml:       { baseSeed: 777,  orders: [20, 60],  ticket: [140, 300], inventoryCount: 20, currency: "BRL" },
  amz:      { baseSeed: 42,   orders: [15, 45],  ticket: [80, 250],  inventoryCount: 25, currency: "BRL" },
  shopee:   { baseSeed: 137,  orders: [30, 80],  ticket: [40, 120],  inventoryCount: 20, currency: "BRL" },
  netshoes: { baseSeed: 512,  orders: [5, 15],   ticket: [180, 400], inventoryCount: 15, currency: "BRL" },
  dafiti:   { baseSeed: 789,  orders: [3, 10],   ticket: [200, 600], inventoryCount: 12, currency: "BRL" },
};

// ─── Product catalogs ─────────────────────────────────────────────────────────

const PRODUCT_TITLES: Record<string, string[]> = {
  ml: [
    "Tênis Nike Air Max 270 Masculino", "Camiseta Polo Ralph Lauren", "Calça Jeans Slim Fit Masculina",
    "Bolsa Feminina Couro Sintético", "Vestido Midi Floral Feminino", "Shorts Academia Dry Fit",
    "Jaqueta Corta-Vento Impermeável", "Bermuda Cargo Masculina", "Blusa Cropped Feminina",
    "Casaco Moletom Com Capuz", "Sapato Social Couro Masculino", "Sandália Anabela Feminina",
    "Mochila Escolar 40L", "Regata Cavada Masculina", "Legging Cintura Alta Feminina",
    "Tênis Vans Old Skool", "Suéter Tricot Feminino", "Calça Moletom Jogger",
    "Saia Midi Plissada", "Boné Aba Curva Masculino",
  ],
  amz: [
    "Echo Dot 5ª Geração", "Kindle Paperwhite 11ª", "Fire TV Stick 4K", "Ring Video Doorbell",
    "AirPods Pro 2", "Samsung Galaxy Buds2", "JBL Flip 6", "Logitech MX Master 3S",
    "SSD Kingston 480GB", "Carregador Anker 65W", "Mouse Gamer Razer", "Teclado Mecânico HyperX",
    "Webcam Logitech C920", "HD Externo Seagate 2TB", "Fone Bluetooth QCY",
    "Smart Plug Positivo", "Chromecast com Google TV", "Alexa Echo Show 8",
    "Roteador Wi-Fi 6 TP-Link", "Câmera IP Intelbras",
  ],
  shopee: [
    "Capa iPhone 15 Silicone", "Película 9D Samsung A54", "Fone Bluetooth i12 TWS",
    "Carregador Turbo 30W", "Ring Light 26cm Tripé", "Suporte Celular Carro",
    "Cabo USB-C 2m Nylon", "Mouse Sem Fio 2.4GHz", "Fita LED RGB 5m WiFi",
    "Organizador Maquiagem Acrílico", "Camiseta Dry Fit Masculina", "Meia Invisível Kit 6 Pares",
    "Relógio Digital LED", "Garrafa Térmica 500ml", "Escova Dental Elétrica USB",
    "Suporte Notebook Ergonômico", "Almofada Ortopédica Viscoelástica", "Luminária LED Dobrável",
    "Tapete Antiderrapante Banheiro", "Porta-Retrato Magnético",
  ],
  netshoes: [
    "Tênis Adidas Ultraboost 22", "Chuteira Nike Mercurial Campo", "Bola Futebol Campo Penalty",
    "Camiseta Dry Fit Compressão", "Shorts Futebol Umbro", "Meias Esportivas Penalty Kit 3",
    "Luva Goleiro Umbro", "Caneleira Cano Alto", "Bolsa Esportiva Nike Training",
    "Sunga Speedo Masculina", "Óculos Natação Hammerhead", "Raquete Tênis Wilson",
    "Bola Basquete Spalding", "Capacete Ciclismo Giro", "Tênis Running Asics Gel",
    "Bermuda Corrida Nike Dri-Fit", "Jaqueta Corta-Vento Adidas", "Chinelo Havaianas Surf",
    "Tênis Futsal Topper", "Corda de Pular Speed Muvin",
  ],
  dafiti: [
    "Tênis Schutz Plataforma Feminino", "Bolsa Shoulder Bag Couro", "Sandália Rasteira Arezzo",
    "Vestido Longo Estampado", "Jaqueta Jeans Oversized", "Calça Alfaiataria Wide Leg",
    "Blusa Manga Longa Decote V", "Saia Midi Satin", "Tênis Dad Chunky Feminino",
    "Clutch Festa Dourada", "Mocassim Masculino Couro", "Oxford Masculino Bico Fino",
    "Cinto Couro Legítimo", "Bota Cano Longo Feminina", "Camisa Social Slim Fit",
    "Óculos de Sol Gatinho UV400", "Lenço Estampado Viscose", "Pulseira Dourada Ajustável",
    "Chapéu Bucket Hat", "Meias-calça Fio 40",
  ],
};

const PRODUCT_THUMBNAILS: Record<string, string[]> = {
  ml: [
    "https://cdn.dummyjson.com/product-images/tops/blue-womens-handbag/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/black-t-shirts/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/blue-dress-slim-fit-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-bags/black-handbag/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-dresses/black-women-dress/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/black-t-shirts/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/grey-polo-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/blue-dress-slim-fit-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/tops/blue-womens-handbag/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/black-t-shirts/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shoes/black-sneakers-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-shoes/calvin-klein-heel-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/selfie-stick-monopod/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/black-t-shirts/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-shoes/flatforms-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shoes/black-sneakers-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/tops/blue-womens-handbag/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/blue-dress-slim-fit-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-dresses/black-women-dress/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/grey-polo-shirt/thumbnail.webp",
  ],
  amz: [
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-homepod-mini-cosmic-grey/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/tablets/ipad-mini-2021-starlight/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/tv-studio-camera-pedestal/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/selfie-lamp-with-iphone/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/laptops/asus-zenbook-pro-dual-screen-laptop/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-iphone-charger/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-watch-series-4-gold/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/laptops/huawei-matebook-x-pro/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/monopod/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/laptops/dell-xps-8940-desktop-computer/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-magsafe-battery-pack/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-homepod-mini-cosmic-grey/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/tablets/ipad-mini-2021-starlight/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/laptops/asus-zenbook-pro-dual-screen-laptop/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/selfie-lamp-with-iphone/thumbnail.webp",
  ],
  shopee: [
    "https://cdn.dummyjson.com/product-images/mobile-accessories/iphone-12-silicone-case-with-magsafe-plum/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/smartphones/samsung-galaxy-s8/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpower-wireless-charger/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/selfie-lamp-with-iphone/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/selfie-stick-monopod/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-iphone-charger/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-magsafe-battery-pack/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/home-decoration/table-lamp/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/home-decoration/decoration-swing/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/tops/blue-womens-handbag/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-shoes/calvin-klein-heel-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-watch-series-4-gold/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/kitchen-accessories/glass/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/home-decoration/table-lamp/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/home-decoration/decoration-swing/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/home-decoration/plant-pot/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/monopod/thumbnail.webp",
  ],
  netshoes: [
    "https://cdn.dummyjson.com/product-images/mens-shoes/black-sneakers-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shoes/black-formal-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/sports-accessories/football/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/black-t-shirts/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/blue-dress-slim-fit-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/grey-polo-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/sports-accessories/football/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/black-t-shirts/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mobile-accessories/selfie-stick-monopod/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/blue-dress-slim-fit-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/sports-accessories/football/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/sports-accessories/football/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/sports-accessories/football/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shoes/black-sneakers-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shoes/black-sneakers-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/black-t-shirts/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/grey-polo-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shoes/black-sneakers-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shoes/black-formal-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/sports-accessories/football/thumbnail.webp",
  ],
  dafiti: [
    "https://cdn.dummyjson.com/product-images/womens-shoes/flatforms-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-bags/black-handbag/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-shoes/calvin-klein-heel-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-dresses/black-women-dress/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/blue-dress-slim-fit-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-dresses/black-women-dress/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/tops/blue-womens-handbag/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-dresses/black-women-dress/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-shoes/flatforms-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-bags/black-handbag/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shoes/black-formal-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shoes/black-formal-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/blue-dress-slim-fit-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-shoes/flatforms-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/grey-polo-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-shoes/calvin-klein-heel-shoes/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-bags/black-handbag/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-bags/black-handbag/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/mens-shirts/grey-polo-shirt/thumbnail.webp",
    "https://cdn.dummyjson.com/product-images/womens-shoes/flatforms-shoes/thumbnail.webp",
  ],
};

// ─── Core generators ──────────────────────────────────────────────────────────

function generateDailyData(
  seed: number,
  daysBack: number,
  ordersRange: [number, number],
  ticketRange: [number, number],
): DailyBreakdown[] {
  const rng = seededRandom(seed);
  const today = new Date();
  return Array.from({ length: daysBack }, (_, i) => {
    const date = format(subDays(today, daysBack - 1 - i), "yyyy-MM-dd");
    const qty = Math.floor(rng() * (ordersRange[1] - ordersRange[0]) + ordersRange[0]);
    const avgTicket = rng() * (ticketRange[1] - ticketRange[0]) + ticketRange[0];
    const total = Math.round(qty * avgTicket * 100) / 100;
    const approved = Math.round(total * (0.82 + rng() * 0.12) * 100) / 100;
    const cancelled = Math.floor(qty * rng() * 0.08);
    const shipped = qty - cancelled;
    const visits = Math.floor(qty * (8 + rng() * 15));
    const buyers = Math.floor(qty * (0.85 + rng() * 0.1));
    return { date, total, approved, qty, units_sold: qty, cancelled, shipped, unique_visits: visits, unique_buyers: buyers };
  });
}

function generateHourlyData(seed: number, date: string, totalOrders: number, avgTicket: number): HourlyBreakdown[] {
  const rng = seededRandom(seed);
  const weights = [1, 0.5, 0.3, 0.2, 0.2, 0.3, 0.8, 2, 3, 5, 6, 7, 6, 5, 5, 4, 4, 5, 6, 7, 6, 5, 3, 2];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  return weights.map((w, hour) => {
    const base = (w / totalWeight) * totalOrders;
    const qty = Math.max(0, Math.round(base + (rng() - 0.5) * 3));
    const total = Math.round(qty * avgTicket * (0.9 + rng() * 0.2) * 100) / 100;
    const approved = Math.round(total * (0.85 + rng() * 0.1) * 100) / 100;
    return { date, hour, total, approved, qty };
  });
}

function generateProducts(
  seed: number,
  marketplace: string,
  count: number,
  ticketRange: [number, number],
  storePrefix: string,
): ProductSalesRow[] {
  const rng = seededRandom(seed);
  const titles = PRODUCT_TITLES[marketplace] ?? PRODUCT_TITLES.ml;
  const thumbnails = PRODUCT_THUMBNAILS[marketplace] ?? [];
  return titles.slice(0, count).map((title, i) => {
    const qty = Math.floor(rng() * 50 + 5);
    const price = Math.round((rng() * (ticketRange[1] - ticketRange[0]) + ticketRange[0]) * 100) / 100;
    return {
      item_id: `${storePrefix}-${marketplace.toUpperCase().slice(0, 3)}-${String(1000 + i)}`,
      title,
      thumbnail: thumbnails[i] ?? null,
      qty_sold: qty,
      revenue: Math.round(qty * price * 100) / 100,
      available_quantity: Math.floor(rng() * 100),
    };
  });
}

function generateInventoryItems(
  seed: number,
  marketplace: string,
  count: number,
  ticketRange: [number, number],
  storePrefix: string,
): { items: MockInventoryItem[]; summary: MockInventorySummary } {
  const rng = seededRandom(seed + 999);
  const products = generateProducts(seed + 500, marketplace, count, ticketRange, storePrefix);
  let outOfStock = 0, lowStock = 0, totalStock = 0;
  const items: MockInventoryItem[] = products.map((p) => {
    const qty = Math.floor(rng() * 120);
    const sold = Math.floor(rng() * 200);
    if (qty === 0) outOfStock++;
    else if (qty <= 5) lowStock++;
    totalStock += qty;
    return {
      id: p.item_id,
      title: p.title,
      available_quantity: qty,
      sold_quantity: sold,
      price: p.revenue / (p.qty_sold || 1),
      currency_id: "BRL",
      thumbnail: p.thumbnail,
      status: qty > 0 ? "active" : "paused",
      category_id: null,
      listing_type_id: "gold_special",
      health: rng() > 0.3 ? Math.round(rng() * 40 + 60) : null,
      visits: Math.floor(rng() * 5000),
      has_variations: false,
      variations: [],
    };
  });
  return { items, summary: { totalItems: items.length, totalStock, outOfStock, lowStock } };
}

// ─── Resolve marketplace shortcode → profile key ──────────────────────────────

/** Normalize any marketplace id variant to profile key */
function normalizeMarketplace(marketplace: string): string {
  const map: Record<string, string> = {
    "ml": "ml",
    "mercado-livre": "ml",
    "mercadolivre": "ml",
    "amz": "amz",
    "amazon": "amz",
    "shopee": "shopee",
    "netshoes": "netshoes",
    "dafiti": "dafiti",
  };
  return map[marketplace.toLowerCase()] ?? marketplace;
}

// Short prefix from storeId for item_id generation (last 6 chars)
function storePrefix(storeId: string): string {
  return storeId.replace(/-/g, "").slice(-6).toUpperCase();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getStoreDailyData(storeId: string, marketplace: string, daysBack = 30): DailyBreakdown[] {
  const key = normalizeMarketplace(marketplace);
  const profile = MARKETPLACE_PROFILES[key];
  if (!profile) return [];
  const seed = storeSeed(storeId, profile.baseSeed);
  return generateDailyData(seed, daysBack, profile.orders, profile.ticket);
}

export function getStoreHourlyData(storeId: string, marketplace: string, date?: string): HourlyBreakdown[] {
  const key = normalizeMarketplace(marketplace);
  const profile = MARKETPLACE_PROFILES[key];
  if (!profile) return [];
  const d = date ?? format(new Date(), "yyyy-MM-dd");
  const seed = storeSeed(storeId, profile.baseSeed);
  const avgOrders = (profile.orders[0] + profile.orders[1]) / 2;
  const avgTicket = (profile.ticket[0] + profile.ticket[1]) / 2;
  return generateHourlyData(seed + (d.charCodeAt(8) || 0), d, avgOrders, avgTicket);
}

export function getStoreProducts(storeId: string, marketplace: string): ProductSalesRow[] {
  const key = normalizeMarketplace(marketplace);
  const profile = MARKETPLACE_PROFILES[key];
  if (!profile) return [];
  const seed = storeSeed(storeId, profile.baseSeed);
  return generateProducts(seed, key, profile.inventoryCount, profile.ticket, storePrefix(storeId));
}

export function getStoreInventory(storeId: string, marketplace: string): { items: MockInventoryItem[]; summary: MockInventorySummary } {
  const key = normalizeMarketplace(marketplace);
  const profile = MARKETPLACE_PROFILES[key];
  if (!profile) return { items: [], summary: { totalItems: 0, totalStock: 0, outOfStock: 0, lowStock: 0 } };
  const seed = storeSeed(storeId, profile.baseSeed);
  return generateInventoryItems(seed, key, profile.inventoryCount, profile.ticket, storePrefix(storeId));
}

// ─── Multi-store aggregation helpers ─────────────────────────────────────────

export interface StoreRef { id: string; marketplace: string; }

export function aggregateStoreDailyData(stores: StoreRef[], daysBack = 30): DailyBreakdown[] {
  if (stores.length === 0) return [];
  const allData = stores.map((s) => getStoreDailyData(s.id, s.marketplace, daysBack));
  const dateMap = new Map<string, DailyBreakdown>();
  for (const list of allData) {
    for (const d of list) {
      const ex = dateMap.get(d.date);
      if (ex) {
        ex.total       += d.total;
        ex.approved    += d.approved;
        ex.qty         += d.qty;
        ex.units_sold  += d.units_sold;
        ex.cancelled   += d.cancelled;
        ex.shipped     += d.shipped;
        ex.unique_visits  += d.unique_visits;
        ex.unique_buyers  += d.unique_buyers;
      } else {
        dateMap.set(d.date, { ...d });
      }
    }
  }
  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateStoreHourlyData(stores: StoreRef[], date?: string): HourlyBreakdown[] {
  if (stores.length === 0) return [];
  const allData = stores.map((s) => getStoreHourlyData(s.id, s.marketplace, date));
  const hourMap = new Map<number, HourlyBreakdown>();
  for (const list of allData) {
    for (const h of list) {
      const ex = hourMap.get(h.hour);
      if (ex) {
        ex.total    += h.total;
        ex.approved += h.approved;
        ex.qty      += h.qty;
      } else {
        hourMap.set(h.hour, { ...h });
      }
    }
  }
  return Array.from(hourMap.values()).sort((a, b) => a.hour - b.hour);
}

export function aggregateStoreProducts(stores: StoreRef[]): ProductSalesRow[] {
  return stores.flatMap((s) => getStoreProducts(s.id, s.marketplace));
}

export function aggregateStoreInventory(stores: StoreRef[]): { items: MockInventoryItem[]; summary: MockInventorySummary } {
  const allItems: MockInventoryItem[] = [];
  let totalItems = 0, totalStock = 0, outOfStock = 0, lowStock = 0;
  for (const s of stores) {
    const { items, summary } = getStoreInventory(s.id, s.marketplace);
    allItems.push(...items);
    totalItems  += summary.totalItems;
    totalStock  += summary.totalStock;
    outOfStock  += summary.outOfStock;
    lowStock    += summary.lowStock;
  }
  return { items: allItems, summary: { totalItems, totalStock, outOfStock, lowStock } };
}

// ─── Marketplace display metadata ────────────────────────────────────────────

export function getMarketplaceDisplayName(marketplace: string): string {
  const names: Record<string, string> = {
    ml:       "Mercado Livre",
    amz:      "Amazon",
    shopee:   "Shopee",
    netshoes: "Netshoes",
    dafiti:   "Dafiti",
  };
  return names[normalizeMarketplace(marketplace)] ?? marketplace;
}
