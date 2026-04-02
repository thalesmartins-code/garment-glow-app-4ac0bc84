import { format, subDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReputationLevel = "green" | "light_green" | "yellow" | "orange" | "red";

export interface ReputationSummary {
  level: ReputationLevel;
  levelLabel: string;
  transactions_completed: number;
  positive_rating: number;
  neutral_rating: number;
  negative_rating: number;
  claims_rate: number;
  delayed_handling_rate: number;
  cancellation_rate: number;
  is_power_seller: boolean;
  response_time_hours: number;
}

export interface FeedbackEntry {
  id: string;
  date: string;
  rating: "positive" | "neutral" | "negative";
  comment: string;
  item_title: string;
  fulfilled_by: "seller" | "mercadolivre";
}

export interface FeedbackDailyStat {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const POSITIVE_COMMENTS = [
  "Produto excelente, chegou antes do prazo!",
  "Muito bom, exatamente como descrito.",
  "Ótima qualidade, recomendo!",
  "Entrega rápida e produto bem embalado.",
  "Perfeito! Adorei o produto.",
  "Vendedor confiável, produto de qualidade.",
  "Superou minhas expectativas.",
  "Produto idêntico às fotos, muito satisfeito.",
];

const NEUTRAL_COMMENTS = [
  "Produto ok, mas a embalagem estava amassada.",
  "Demorou mais do que o esperado, mas chegou.",
  "Produto bom mas poderia ser melhor embalado.",
  "Atendeu as expectativas básicas.",
];

const NEGATIVE_COMMENTS = [
  "Produto veio com defeito.",
  "Não era o que estava descrito no anúncio.",
  "Demorou muito mais que o prazo anunciado.",
  "Produto de qualidade inferior ao prometido.",
];

const ITEM_TITLES = [
  "Tênis Nike Air Max 270",
  "Camiseta Polo Masculina",
  "Shorts Academia Dry Fit",
  "Legging Cintura Alta",
  "Jaqueta Corta-Vento",
  "Tênis Vans Old Skool",
  "Bermuda Cargo Masculina",
  "Blusa Cropped Feminina",
  "Calça Jeans Slim Fit",
  "Casaco Moletom Com Capuz",
];

const LEVELS: ReputationLevel[] = ["green", "light_green", "yellow", "orange", "red"];
const LEVEL_LABELS = {
  green: "Verde",
  light_green: "Verde Claro",
  yellow: "Amarelo",
  orange: "Laranja",
  red: "Vermelho",
};

// ─── Generators ───────────────────────────────────────────────────────────────

export function getMockReputationSummary(storeId: string): ReputationSummary {
  const rng = seededRandom(storeSeed(storeId, 0xREP1));
  const levelIdx = Math.floor(rng() * 3); // bias toward green/light_green/yellow
  const level = LEVELS[levelIdx];
  const positive = 92 + rng() * 7;
  const negative = 0.5 + rng() * 3;
  const neutral = 100 - positive - negative;

  return {
    level,
    levelLabel: LEVEL_LABELS[level],
    transactions_completed: Math.floor(500 + rng() * 4500),
    positive_rating: Math.round(positive * 10) / 10,
    neutral_rating: Math.round(neutral * 10) / 10,
    negative_rating: Math.round(negative * 10) / 10,
    claims_rate: Math.round(rng() * 3 * 10) / 10,
    delayed_handling_rate: Math.round(rng() * 5 * 10) / 10,
    cancellation_rate: Math.round(rng() * 4 * 10) / 10,
    is_power_seller: rng() > 0.4,
    response_time_hours: Math.round((1 + rng() * 23) * 10) / 10,
  };
}

export function getMockFeedbackDaily(storeId: string, daysBack: number = 30): FeedbackDailyStat[] {
  const rng = seededRandom(storeSeed(storeId, 0xFEED));
  const today = new Date();
  return Array.from({ length: daysBack }, (_, i) => {
    const date = format(subDays(today, daysBack - 1 - i), "yyyy-MM-dd");
    const positive = Math.floor(3 + rng() * 12);
    const neutral = Math.floor(rng() * 3);
    const negative = Math.floor(rng() * 2);
    return { date, positive, neutral, negative };
  });
}

export function getMockFeedbackEntries(storeId: string, count = 20): FeedbackEntry[] {
  const rng = seededRandom(storeSeed(storeId, 0xENTR));
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const r = rng();
    const rating: FeedbackEntry["rating"] =
      r < 0.85 ? "positive" : r < 0.93 ? "neutral" : "negative";
    const comments =
      rating === "positive"
        ? POSITIVE_COMMENTS
        : rating === "neutral"
        ? NEUTRAL_COMMENTS
        : NEGATIVE_COMMENTS;
    return {
      id: `fb-${storeId}-${i}`,
      date: format(subDays(today, Math.floor(rng() * 30)), "yyyy-MM-dd"),
      rating,
      comment: comments[Math.floor(rng() * comments.length)],
      item_title: ITEM_TITLES[Math.floor(rng() * ITEM_TITLES.length)],
      fulfilled_by: rng() > 0.3 ? "seller" : "mercadolivre",
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}
