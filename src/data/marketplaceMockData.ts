import { format, subDays } from "date-fns";

// Types matching the pages
interface DailyBreakdown {
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

interface HourlyBreakdown {
  date: string;
  hour: number;
  total: number;
  approved: number;
  qty: number;
}

interface ProductSalesRow {
  item_id: string;
  title: string;
  thumbnail: string | null;
  qty_sold: number;
  revenue: number;
  available_quantity?: number;
}

export interface MockInventoryItem {
  id: string;
  title: string;
  available_quantity: number;
  sold_quantity: number;
  price: number;
  currency_id: string;
  thumbnail: string | null;
  status: string;
  category_id: string | null;
  listing_type_id: string | null;
  health: number | null;
  visits: number;
  has_variations: boolean;
  variations: any[];
}

interface MockInventorySummary {
  totalItems: number;
  totalStock: number;
  outOfStock: number;
  lowStock: number;
}

// Seeded random for consistent mock data
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

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

// Stable product thumbnail URLs from DummyJSON CDN
const PRODUCT_THUMBNAILS: Record<string, string[]> = {
  amazon: [
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-homepod-mini-cosmic-grey/thumbnail.webp", // Echo Dot
    "https://cdn.dummyjson.com/product-images/tablets/ipad-mini-2021-starlight/thumbnail.webp", // Kindle Paperwhite
    "https://cdn.dummyjson.com/product-images/mobile-accessories/tv-studio-camera-pedestal/thumbnail.webp", // Fire TV Stick
    "https://cdn.dummyjson.com/product-images/mobile-accessories/selfie-lamp-with-iphone/thumbnail.webp", // Ring Doorbell
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/thumbnail.webp", // AirPods Pro
    "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp", // Galaxy Buds2
    "https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp", // JBL Flip 6
    "https://cdn.dummyjson.com/product-images/laptops/asus-zenbook-pro-dual-screen-laptop/thumbnail.webp", // MX Master 3S
    "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/thumbnail.webp", // SSD Kingston
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-iphone-charger/thumbnail.webp", // Carregador Anker
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-watch-series-4-gold/thumbnail.webp", // Mouse Razer
    "https://cdn.dummyjson.com/product-images/laptops/huawei-matebook-x-pro/thumbnail.webp", // Teclado HyperX
    "https://cdn.dummyjson.com/product-images/mobile-accessories/monopod/thumbnail.webp", // Webcam C920
    "https://cdn.dummyjson.com/product-images/laptops/dell-xps-8940-desktop-computer/thumbnail.webp", // HD Seagate
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-magsafe-battery-pack/thumbnail.webp", // Fone QCY
  ],
  shopee: [
    "https://cdn.dummyjson.com/product-images/mobile-accessories/iphone-12-silicone-case-with-magsafe-plum/thumbnail.webp", // Capa iPhone
    "https://cdn.dummyjson.com/product-images/smartphones/samsung-galaxy-s8/thumbnail.webp", // Película Samsung
    "https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp", // Fone i12
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpower-wireless-charger/thumbnail.webp", // Carregador Turbo
    "https://cdn.dummyjson.com/product-images/mobile-accessories/selfie-lamp-with-iphone/thumbnail.webp", // Ring Light
    "https://cdn.dummyjson.com/product-images/mobile-accessories/selfie-stick-monopod/thumbnail.webp", // Suporte Celular
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-iphone-charger/thumbnail.webp", // Cabo USB-C
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-magsafe-battery-pack/thumbnail.webp", // Mouse Sem Fio
    "https://cdn.dummyjson.com/product-images/home-decoration/table-lamp/thumbnail.webp", // Fita LED
    "https://cdn.dummyjson.com/product-images/home-decoration/decoration-swing/thumbnail.webp", // Organizador
    "https://cdn.dummyjson.com/product-images/tops/blue-womens-handbag/thumbnail.webp", // Camiseta
    "https://cdn.dummyjson.com/product-images/womens-shoes/calvin-klein-heel-shoes/thumbnail.webp", // Meia
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-watch-series-4-gold/thumbnail.webp", // Relógio
    "https://cdn.dummyjson.com/product-images/kitchen-accessories/glass/thumbnail.webp", // Garrafa
    "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp", // Escova Dental
  ],
  magalu: [
    "https://cdn.dummyjson.com/product-images/tablets/samsung-galaxy-tab-s8-plus-grey/thumbnail.webp", // Smart TV LG
    "https://cdn.dummyjson.com/product-images/kitchen-accessories/electric-stove/thumbnail.webp", // Geladeira
    "https://cdn.dummyjson.com/product-images/kitchen-accessories/boxed-blender/thumbnail.webp", // Máquina Lavar
    "https://cdn.dummyjson.com/product-images/home-decoration/plant-pot/thumbnail.webp", // Ar Condicionado
    "https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp", // Notebook
    "https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/thumbnail.webp", // iPhone 15
    "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-homepod-mini-cosmic-grey/thumbnail.webp", // Aspirador Robô
    "https://cdn.dummyjson.com/product-images/kitchen-accessories/black-aluminium-cup/thumbnail.webp", // Cafeteira
    "https://cdn.dummyjson.com/product-images/kitchen-accessories/carbon-steel-wok/thumbnail.webp", // Air Fryer
    "https://cdn.dummyjson.com/product-images/kitchen-accessories/fine-mesh-strainer/thumbnail.webp", // Micro-ondas
    "https://cdn.dummyjson.com/product-images/kitchen-accessories/hand-blender/thumbnail.webp", // Processador
    "https://cdn.dummyjson.com/product-images/home-decoration/house-showpiece-plant/thumbnail.webp", // Ventilador
    "https://cdn.dummyjson.com/product-images/kitchen-accessories/electric-stove/thumbnail.webp", // Fogão
    "https://cdn.dummyjson.com/product-images/kitchen-accessories/boxed-blender/thumbnail.webp", // Batedeira
    "https://cdn.dummyjson.com/product-images/kitchen-accessories/glass/thumbnail.webp", // Purificador
  ],
};

function generateProducts(seed: number, marketplace: string, count: number, ticketRange: [number, number]): ProductSalesRow[] {
  const rng = seededRandom(seed);
  const prefixes: Record<string, string[]> = {
    amazon: ["Echo Dot 5ª Geração", "Kindle Paperwhite 11ª", "Fire TV Stick 4K", "Ring Video Doorbell", "AirPods Pro 2", "Samsung Galaxy Buds2", "JBL Flip 6", "Logitech MX Master 3S", "SSD Kingston 480GB", "Carregador Anker 65W", "Mouse Gamer Razer", "Teclado Mecânico HyperX", "Webcam Logitech C920", "HD Externo Seagate 2TB", "Fone Bluetooth QCY"],
    shopee: ["Capa iPhone 15 Silicone", "Película 9D Samsung A54", "Fone Bluetooth i12 TWS", "Carregador Turbo 30W", "Ring Light 26cm Tripé", "Suporte Celular Carro", "Cabo USB-C 2m Nylon", "Mouse Sem Fio 2.4GHz", "Fita LED RGB 5m WiFi", "Organizador Maquiagem Acrílico", "Camiseta Dry Fit Masculina", "Meia Invisível Kit 6 Pares", "Relógio Digital LED", "Garrafa Térmica 500ml", "Escova Dental Elétrica USB"],
    magalu: ["Smart TV LG 55\" 4K", "Geladeira Brastemp Frost Free", "Máquina Lavar Electrolux 12kg", "Ar Condicionado Split 12000 BTU", "Notebook Lenovo IdeaPad", "iPhone 15 128GB", "Aspirador Robô Xiaomi", "Cafeteira Nespresso Vertuo", "Fritadeira Air Fryer Mondial 5L", "Micro-ondas Panasonic 32L", "Processador Philips Walita", "Ventilador Arno Turbo", "Fogão Consul 4 Bocas", "Batedeira Planetária KitchenAid", "Purificador Água Electrolux"],
  };
  const thumbnails = PRODUCT_THUMBNAILS[marketplace] || [];
  const items = prefixes[marketplace] || prefixes.amazon;
  return items.slice(0, count).map((title, i) => {
    const qty = Math.floor(rng() * 50 + 5);
    const price = Math.round((rng() * (ticketRange[1] - ticketRange[0]) + ticketRange[0]) * 100) / 100;
    return {
      item_id: `${marketplace.toUpperCase().slice(0, 3)}${String(1000 + i)}`,
      title,
      thumbnail: thumbnails[i] || null,
      qty_sold: qty,
      revenue: Math.round(qty * price * 100) / 100,
      available_quantity: Math.floor(rng() * 100),
    };
  });
}

function generateInventoryItems(seed: number, marketplace: string, count: number, ticketRange: [number, number]): { items: MockInventoryItem[]; summary: MockInventorySummary } {
  const rng = seededRandom(seed + 999);
  const products = generateProducts(seed + 500, marketplace, count, ticketRange);
  let outOfStock = 0;
  let lowStock = 0;
  let totalStock = 0;

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
      thumbnail: null,
      status: qty > 0 ? "active" : "paused",
      category_id: null,
      listing_type_id: "gold_special",
      health: rng() > 0.3 ? Math.round(rng() * 40 + 60) : null,
      visits: Math.floor(rng() * 5000),
      has_variations: false,
      variations: [],
    };
  });

  return {
    items,
    summary: { totalItems: items.length, totalStock, outOfStock, lowStock },
  };
}

// Config per marketplace
const MP_CONFIG: Record<string, { seed: number; orders: [number, number]; ticket: [number, number]; inventoryCount: number }> = {
  "mercado-livre": { seed: 7, orders: [25, 70], ticket: [60, 200], inventoryCount: 30 },
  amazon:     { seed: 42,  orders: [15, 45], ticket: [80, 250],  inventoryCount: 25 },
  shopee:     { seed: 137, orders: [30, 80], ticket: [40, 120],  inventoryCount: 20 },
  magalu:     { seed: 256, orders: [10, 30], ticket: [100, 350], inventoryCount: 15 },
  netshoes:   { seed: 311, orders: [5, 20],  ticket: [90, 280],  inventoryCount: 10 },
  dafiti:     { seed: 389, orders: [8, 25],  ticket: [70, 220],  inventoryCount: 12 },
  americanas: { seed: 444, orders: [12, 35], ticket: [60, 200],  inventoryCount: 15 },
  casasbahia: { seed: 502, orders: [8, 28],  ticket: [120, 400], inventoryCount: 12 },
};

export function getMarketplaceDailyData(marketplaceId: string, daysBack = 30): DailyBreakdown[] {
  const cfg = MP_CONFIG[marketplaceId];
  if (!cfg) return [];
  return generateDailyData(cfg.seed, daysBack, cfg.orders, cfg.ticket);
}

export function getMarketplaceHourlyData(marketplaceId: string, date?: string): HourlyBreakdown[] {
  const cfg = MP_CONFIG[marketplaceId];
  if (!cfg) return [];
  const d = date || format(new Date(), "yyyy-MM-dd");
  const avgOrders = (cfg.orders[0] + cfg.orders[1]) / 2;
  const avgTicket = (cfg.ticket[0] + cfg.ticket[1]) / 2;
  return generateHourlyData(cfg.seed + d.charCodeAt(8), d, avgOrders, avgTicket);
}

export function getMarketplaceProducts(marketplaceId: string): ProductSalesRow[] {
  const cfg = MP_CONFIG[marketplaceId];
  if (!cfg) return [];
  return generateProducts(cfg.seed, marketplaceId, cfg.inventoryCount, cfg.ticket);
}

export function getMarketplaceInventory(marketplaceId: string): { items: MockInventoryItem[]; summary: MockInventorySummary } {
  const cfg = MP_CONFIG[marketplaceId];
  if (!cfg) return { items: [], summary: { totalItems: 0, totalStock: 0, outOfStock: 0, lowStock: 0 } };
  return generateInventoryItems(cfg.seed, marketplaceId, cfg.inventoryCount, cfg.ticket);
}

// Aggregate mock data from Amazon + Shopee + Magalu
const MOCK_MARKETPLACE_IDS = ["mercado-livre", "amazon", "shopee", "magalu", "netshoes", "dafiti", "americanas", "casasbahia"];

export function getAllMarketplaceMockDaily(daysBack = 30): DailyBreakdown[] {
  const allData = MOCK_MARKETPLACE_IDS.map((id) => getMarketplaceDailyData(id, daysBack));
  const dateMap = new Map<string, DailyBreakdown>();
  for (const list of allData) {
    for (const d of list) {
      const existing = dateMap.get(d.date);
      if (existing) {
        existing.total += d.total;
        existing.approved += d.approved;
        existing.qty += d.qty;
        existing.units_sold += d.units_sold;
        existing.cancelled += d.cancelled;
        existing.shipped += d.shipped;
        existing.unique_visits += d.unique_visits;
        existing.unique_buyers += d.unique_buyers;
      } else {
        dateMap.set(d.date, { ...d });
      }
    }
  }
  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function getAllMarketplaceMockHourly(date?: string): HourlyBreakdown[] {
  const allData = MOCK_MARKETPLACE_IDS.map((id) => getMarketplaceHourlyData(id, date));
  const hourMap = new Map<number, HourlyBreakdown>();
  for (const list of allData) {
    for (const h of list) {
      const existing = hourMap.get(h.hour);
      if (existing) {
        existing.total += h.total;
        existing.approved += h.approved;
        existing.qty += h.qty;
      } else {
        hourMap.set(h.hour, { ...h });
      }
    }
  }
  return Array.from(hourMap.values()).sort((a, b) => a.hour - b.hour);
}

export function getAllMarketplaceMockProducts(): ProductSalesRow[] {
  return MOCK_MARKETPLACE_IDS.flatMap((id) => getMarketplaceProducts(id));
}

export function getAllMarketplaceInventory(): { items: MockInventoryItem[]; summary: MockInventorySummary } {
  const allItems: MockInventoryItem[] = [];
  let totalItems = 0, totalStock = 0, outOfStock = 0, lowStock = 0;
  for (const id of MOCK_MARKETPLACE_IDS) {
    const { items, summary } = getMarketplaceInventory(id);
    allItems.push(...items);
    totalItems += summary.totalItems;
    totalStock += summary.totalStock;
    outOfStock += summary.outOfStock;
    lowStock += summary.lowStock;
  }
  return { items: allItems, summary: { totalItems, totalStock, outOfStock, lowStock } };
}

export function getMarketplaceName(id: string): string {
  const names: Record<string, string> = {
    "mercado-livre": "Mercado Livre",
    amazon: "Amazon",
    shopee: "Shopee",
    magalu: "Magazine Luiza",
  };
  return names[id] || id;
}
