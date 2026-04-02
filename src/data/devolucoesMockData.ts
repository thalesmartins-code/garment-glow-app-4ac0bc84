import { format, subDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClaimStatus = "opened" | "under_review" | "closed_with_refund" | "closed_without_refund";
export type ClaimReason =
  | "not_received"
  | "item_damaged"
  | "item_different"
  | "does_not_work"
  | "incomplete_package"
  | "regret";

export interface DevolucoeSummary {
  total_claims: number;
  open_claims: number;
  resolved_claims: number;
  resolution_rate: number;
  avg_resolution_days: number;
  pending_returns: number;
  claims_rate_pct: number;
}

export interface ClaimEntry {
  id: string;
  date: string;
  status: ClaimStatus;
  reason: ClaimReason;
  reason_label: string;
  item_title: string;
  amount: number;
  resolution_days: number | null;
}

export interface DevolucoesDailyStat {
  date: string;
  opened: number;
  resolved: number;
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

const REASON_LABELS: Record<ClaimReason, string> = {
  not_received: "Não recebido",
  item_damaged: "Produto avariado",
  item_different: "Diferente do anunciado",
  does_not_work: "Produto com defeito",
  incomplete_package: "Pacote incompleto",
  regret: "Arrependimento",
};

const REASONS: ClaimReason[] = [
  "not_received", "not_received",
  "item_damaged",
  "item_different", "item_different",
  "does_not_work",
  "incomplete_package",
  "regret",
];

const STATUSES: ClaimStatus[] = [
  "opened", "under_review", "closed_with_refund", "closed_without_refund",
];

const ITEM_TITLES = [
  "Tênis Nike Air Max 270 Masculino",
  "Camiseta Polo Masculina G",
  "Shorts Academia Dry Fit P",
  "Legging Cintura Alta Feminina",
  "Jaqueta Corta-Vento Impermeável",
  "Tênis Vans Old Skool 42",
  "Calça Jeans Slim Fit Masculina 40",
  "Casaco Moletom Com Capuz M",
];

// ─── Generators ───────────────────────────────────────────────────────────────

export function getMockDevolucoeSummary(storeId: string): DevolucoeSummary {
  const rng = seededRandom(storeSeed(storeId, 0xDE01));
  const total = Math.floor(12 + rng() * 38);
  const open = Math.floor(2 + rng() * 8);
  const resolved = total - open;
  return {
    total_claims: total,
    open_claims: open,
    resolved_claims: resolved,
    resolution_rate: Math.round((resolved / total) * 1000) / 10,
    avg_resolution_days: Math.round((3 + rng() * 9) * 10) / 10,
    pending_returns: Math.floor(rng() * 6),
    claims_rate_pct: Math.round((0.5 + rng() * 3) * 10) / 10,
  };
}

export function getMockDevolucoesDailyStats(storeId: string, daysBack: number = 30): DevolucoesDailyStat[] {
  const rng = seededRandom(storeSeed(storeId, 0xDE0D));
  const today = new Date();
  return Array.from({ length: daysBack }, (_, i) => ({
    date: format(subDays(today, daysBack - 1 - i), "yyyy-MM-dd"),
    opened: Math.floor(rng() * 3),
    resolved: Math.floor(rng() * 3),
  }));
}

export function getMockClaimEntries(storeId: string, count = 20): ClaimEntry[] {
  const rng = seededRandom(storeSeed(storeId, 0xC1A0));
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const reason = REASONS[Math.floor(rng() * REASONS.length)];
    const status = STATUSES[Math.floor(rng() * STATUSES.length)];
    const isResolved = status === "closed_with_refund" || status === "closed_without_refund";
    return {
      id: `claim-${storeId}-${i}`,
      date: format(subDays(today, Math.floor(rng() * 60)), "yyyy-MM-dd"),
      status,
      reason,
      reason_label: REASON_LABELS[reason],
      item_title: ITEM_TITLES[Math.floor(rng() * ITEM_TITLES.length)],
      amount: Math.round((50 + rng() * 450) * 100) / 100,
      resolution_days: isResolved ? Math.round(2 + rng() * 12) : null,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}
