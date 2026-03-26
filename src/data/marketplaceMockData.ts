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

// Real product thumbnail URLs from public sources
const PRODUCT_THUMBNAILS: Record<string, string[]> = {
  amazon: [
    "https://m.media-amazon.com/images/I/71zV7oJk7PL._AC_SL1500_.jpg", // Echo Dot
    "https://m.media-amazon.com/images/I/61PHxZnE4IL._AC_SL1000_.jpg", // Kindle Paperwhite
    "https://m.media-amazon.com/images/I/61YBU1dkHrL._AC_SL1000_.jpg", // Fire TV Stick
    "https://m.media-amazon.com/images/I/61UxFjpOzrL._AC_SL1000_.jpg", // Ring Doorbell
    "https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg", // AirPods Pro
    "https://m.media-amazon.com/images/I/51b+BsNXGYL._AC_SL1500_.jpg", // Galaxy Buds2
    "https://m.media-amazon.com/images/I/71V8XK11PZL._AC_SL1500_.jpg", // JBL Flip 6
    "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg", // MX Master 3S
    "https://m.media-amazon.com/images/I/71RkNMFmZAL._AC_SL1500_.jpg", // SSD Kingston
    "https://m.media-amazon.com/images/I/61aKJKP4enL._AC_SL1500_.jpg", // Carregador Anker
    "https://m.media-amazon.com/images/I/61UYqMpNbnL._AC_SL1500_.jpg", // Mouse Razer
    "https://m.media-amazon.com/images/I/71RrdtzJxnL._AC_SL1500_.jpg", // Teclado HyperX
    "https://m.media-amazon.com/images/I/71iNwni9TsL._AC_SL1500_.jpg", // Webcam C920
    "https://m.media-amazon.com/images/I/71b6U-gv3PL._AC_SL1500_.jpg", // HD Seagate
    "https://m.media-amazon.com/images/I/51UDsQ-CZPL._AC_SL1500_.jpg", // Fone QCY
  ],
  shopee: [
    "https://down-br.img.susercontent.com/file/br-11134207-7r98o-lzugnv8m7k2i96.webp", // Capa iPhone
    "https://down-br.img.susercontent.com/file/sg-11134201-22100-89ialak7hiiv48.webp", // Película Samsung
    "https://down-br.img.susercontent.com/file/br-11134207-7r98o-lxw1fg1r8uq7a6.webp", // Fone i12
    "https://down-br.img.susercontent.com/file/br-11134207-7r98o-lyb3sdqj8vxt3d.webp", // Carregador Turbo
    "https://down-br.img.susercontent.com/file/sg-11134201-22120-20pxzpkh19kv27.webp", // Ring Light
    "https://down-br.img.susercontent.com/file/br-11134207-7r98o-lz7cbdyuhcmp60.webp", // Suporte Celular
    "https://down-br.img.susercontent.com/file/br-11134207-7r98o-lxkxvt3kz23z08.webp", // Cabo USB-C
    "https://down-br.img.susercontent.com/file/sg-11134201-22100-chyf27yt9div63.webp", // Mouse Sem Fio
    "https://down-br.img.susercontent.com/file/sg-11134201-22110-j0m6cxqekgjv05.webp", // Fita LED
    "https://down-br.img.susercontent.com/file/br-11134207-7r98o-lxgxixtbq54l15.webp", // Organizador
    "https://down-br.img.susercontent.com/file/br-11134207-7r98o-lzb0f09yp6i53c.webp", // Camiseta
    "https://down-br.img.susercontent.com/file/br-11134207-7r98o-lxq0v02v6c0j3c.webp", // Meia
    "https://down-br.img.susercontent.com/file/sg-11134201-22110-d3g6dxykkjjvf2.webp", // Relógio
    "https://down-br.img.susercontent.com/file/br-11134207-7r98o-lxdxvz6o8ia904.webp", // Garrafa
    "https://down-br.img.susercontent.com/file/sg-11134201-22100-t5fj1oq09div96.webp", // Escova Dental
  ],
  magalu: [
    "https://a-static.mlcdn.com.br/450x450/smart-tv-55-4k-uhd-led-lg/magazineluiza/235936400/7505d4b7c4a5d72f5e4c1ee84c10ce2a.jpg", // Smart TV LG
    "https://a-static.mlcdn.com.br/450x450/geladeira-brastemp-frost-free/magazineluiza/225089500/2ef89252a58d32c5a44d05be8e7fbc40.jpg", // Geladeira
    "https://a-static.mlcdn.com.br/450x450/lavadora-electrolux-12kg/magazineluiza/224892900/50f8e7a5c9d6e0f1a2b3c4d5e6f7a8b9.jpg", // Máquina Lavar
    "https://a-static.mlcdn.com.br/450x450/ar-condicionado-split-12000-btus/magazineluiza/225834500/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.jpg", // Ar Condicionado
    "https://a-static.mlcdn.com.br/450x450/notebook-lenovo-ideapad/magazineluiza/237175200/d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9.jpg", // Notebook
    "https://a-static.mlcdn.com.br/450x450/iphone-15-128gb/magazineluiza/237483900/f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6.jpg", // iPhone 15
    "https://a-static.mlcdn.com.br/450x450/aspirador-robo-xiaomi/magazineluiza/225675300/b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7.jpg", // Aspirador Robô
    "https://a-static.mlcdn.com.br/450x450/cafeteira-nespresso-vertuo/magazineluiza/224987600/c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8.jpg", // Cafeteira
    "https://a-static.mlcdn.com.br/450x450/fritadeira-air-fryer-mondial-5l/magazineluiza/226198700/e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0.jpg", // Air Fryer
    "https://a-static.mlcdn.com.br/450x450/micro-ondas-panasonic-32l/magazineluiza/225467800/a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2.jpg", // Micro-ondas
    "https://a-static.mlcdn.com.br/450x450/processador-philips-walita/magazineluiza/224356700/b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3.jpg", // Processador
    "https://a-static.mlcdn.com.br/450x450/ventilador-arno-turbo/magazineluiza/225789000/c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4.jpg", // Ventilador
    "https://a-static.mlcdn.com.br/450x450/fogao-consul-4-bocas/magazineluiza/224567800/d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5.jpg", // Fogão
    "https://a-static.mlcdn.com.br/450x450/batedeira-planetaria-kitchenaid/magazineluiza/225890100/e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6.jpg", // Batedeira
    "https://a-static.mlcdn.com.br/450x450/purificador-agua-electrolux/magazineluiza/224678900/f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7.jpg", // Purificador
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
  amazon:  { seed: 42,  orders: [15, 45], ticket: [80, 250],  inventoryCount: 25 },
  shopee:  { seed: 137, orders: [30, 80], ticket: [40, 120],  inventoryCount: 20 },
  magalu:  { seed: 256, orders: [10, 30], ticket: [100, 350], inventoryCount: 15 },
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
const MOCK_MARKETPLACE_IDS = ["amazon", "shopee", "magalu"];

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
