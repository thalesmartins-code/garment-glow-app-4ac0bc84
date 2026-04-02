import { format, subDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PerguntasSummary {
  total_30d: number;
  pending: number;
  answered: number;
  answer_rate: number;
  avg_response_hours: number;
  unanswered_gt_24h: number;
}

export interface PerguntaEntry {
  id: string;
  date: string;
  item_title: string;
  item_id: string;
  question: string;
  answer: string | null;
  status: "answered" | "unanswered";
  hours_to_answer: number | null;
}

export interface PerguntasDailyStat {
  date: string;
  total: number;
  answered: number;
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

const QUESTIONS = [
  "O produto tem nota fiscal?",
  "Qual o prazo de entrega para o Rio de Janeiro?",
  "Tem garantia? Qual o prazo?",
  "Vende no atacado? Tem desconto para quantidade?",
  "O produto tem certificado de qualidade?",
  "Pode enviar para o interior? Qual o frete?",
  "Esse modelo tem em outras cores?",
  "O produto vem embalado para presente?",
  "Qual o tamanho exato do produto?",
  "Aceita troca caso não sirva?",
  "O produto é original? Tem procedência?",
  "Quando esse produto vai ter estoque novamente?",
  "Esse produto serve para uso profissional?",
  "Tem como retirar na loja física?",
];

const ANSWERS = [
  "Sim, o produto acompanha nota fiscal eletrônica.",
  "O prazo de entrega depende da transportadora, geralmente de 5 a 10 dias úteis.",
  "Sim, oferecemos 12 meses de garantia contra defeitos de fabricação.",
  "Para pedidos acima de 10 unidades, entre em contato para negociar.",
  "Sim, produto com certificação e procedência garantida.",
  "Enviamos para todo o Brasil, o frete é calculado no momento da compra.",
  "Por enquanto somente na cor anunciada, mas temos outros modelos.",
  "Podemos embalar para presente sem custo adicional.",
  "As medidas estão descritas na descrição do anúncio.",
  "Sim, aceitamos troca em até 7 dias após o recebimento.",
];

const ITEM_TITLES = [
  "Tênis Nike Air Max 270 Masculino",
  "Camiseta Polo Masculina",
  "Shorts Academia Dry Fit",
  "Legging Cintura Alta Feminina",
  "Jaqueta Corta-Vento Impermeável",
  "Tênis Vans Old Skool",
  "Calça Jeans Slim Fit Masculina",
  "Casaco Moletom Com Capuz",
];

// ─── Generators ───────────────────────────────────────────────────────────────

export function getMockPerguntasSummary(storeId: string): PerguntasSummary {
  const rng = seededRandom(storeSeed(storeId, 0xA001));
  const total = Math.floor(40 + rng() * 120);
  const pending = Math.floor(3 + rng() * 15);
  const answered = total - pending;
  return {
    total_30d: total,
    pending,
    answered,
    answer_rate: Math.round((answered / total) * 1000) / 10,
    avg_response_hours: Math.round((1 + rng() * 11) * 10) / 10,
    unanswered_gt_24h: Math.floor(rng() * pending),
  };
}

export function getMockPerguntasDailyStats(storeId: string, daysBack: number = 30): PerguntasDailyStat[] {
  const rng = seededRandom(storeSeed(storeId, 0xA00D));
  const today = new Date();
  return Array.from({ length: daysBack }, (_, i) => {
    const total = Math.floor(1 + rng() * 8);
    const answered = Math.floor(total * (0.75 + rng() * 0.25));
    return {
      date: format(subDays(today, daysBack - 1 - i), "yyyy-MM-dd"),
      total,
      answered,
    };
  });
}

export function getMockPerguntaEntries(storeId: string, count = 25): PerguntaEntry[] {
  const rng = seededRandom(storeSeed(storeId, 0xA00E));
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const isAnswered = rng() > 0.25;
    const itemIdx = Math.floor(rng() * ITEM_TITLES.length);
    return {
      id: `q-${storeId}-${i}`,
      date: format(subDays(today, Math.floor(rng() * 30)), "yyyy-MM-dd"),
      item_title: ITEM_TITLES[itemIdx],
      item_id: `MLB${1000000 + itemIdx * 1337 + Math.floor(rng() * 9999)}`,
      question: QUESTIONS[Math.floor(rng() * QUESTIONS.length)],
      answer: isAnswered ? ANSWERS[Math.floor(rng() * ANSWERS.length)] : null,
      status: isAnswered ? "answered" : "unanswered",
      hours_to_answer: isAnswered ? Math.round(0.5 + rng() * 23.5) : null,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}
