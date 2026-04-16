import { useState, useCallback } from "react";
import {
  DollarSign, Tag, Calculator, BarChart3, Plug, RefreshCw,
  Info, ChevronDown, ChevronUp, CheckCircle2, TrendingDown,
  TrendingUp, Filter,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import {
  useMLPrecosCustos,
  type MLItemPrice,
  type MLListingCost,
  type MLPriceReference,
} from "@/hooks/useMLPrecosCustos";
import type { UseMLPrecosCustosResult } from "@/hooks/useMLPrecosCustos";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────

const currFmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const pctFmt = (v: number) => `${v.toFixed(1)}%`;

// ── Not Connected ─────────────────────────────────────────────────────────────

function NotConnected() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Plug className="w-16 h-16 text-muted-foreground/40" />
      <h2 className="text-xl font-semibold">Mercado Livre não conectado</h2>
      <p className="text-muted-foreground text-sm">
        Conecte sua conta para acessar preços e custos.
      </p>
      <Button asChild>
        <Link to="/api/integracoes">Conectar conta</Link>
      </Button>
    </div>
  );
}

// ── Real data badge ───────────────────────────────────────────────────────────

function RealDataBadge({ isRealData }: { isRealData: boolean }) {
  if (!isRealData) return null;
  return (
    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs">
      <CheckCircle2 className="w-3 h-3" /> Dados reais
    </Badge>
  );
}

// ── Listing type badge ────────────────────────────────────────────────────────

function ListingTypeBadge({ type }: { type: string }) {
  if (type === "gold_pro")
    return <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30">Premium</Badge>;
  if (type === "gold_special")
    return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30">Clássica</Badge>;
  return <Badge variant="outline">Gratuita</Badge>;
}

// ── Tab: Preços de Produtos ───────────────────────────────────────────────────

function PrecosProdutos({
  items,
  loading,
  isRealData,
}: {
  items: MLItemPrice[];
  loading: boolean;
  isRealData: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.item_id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Buscar por título ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <RealDataBadge isRealData={isRealData} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Preços dos Anúncios Ativos</CardTitle>
          <CardDescription className="text-xs">
            Preços standard e promocionais dos seus produtos — dados diretos da API do Mercado Livre.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Item</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Preço Standard</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Preço Promo</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Preço de Venda</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-16 mx-auto" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24 ml-auto" /></td>
                      </tr>
                    ))
                  : filtered.length === 0
                  ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          {items.length === 0 ? "Nenhum anúncio ativo encontrado." : "Nenhum resultado para a busca."}
                        </td>
                      </tr>
                    )
                  : filtered.map((item) => (
                      <tr key={item.item_id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {item.thumbnail && (
                              <img
                                src={item.thumbnail}
                                alt=""
                                className="w-8 h-8 object-contain rounded shrink-0 bg-muted"
                              />
                            )}
                            <div>
                              <p className="font-medium text-foreground leading-tight line-clamp-1">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.item_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {currFmt(item.price_standard)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {item.price_promo != null ? (
                            <span className="text-emerald-600 font-medium">
                              {currFmt(item.price_promo)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          {currFmt(item.price_sale)}
                          {item.has_promotion && (
                            <Badge className="ml-1.5 bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] px-1 py-0">
                              Promo
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ListingTypeBadge type={item.listing_type_id} />
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {item.last_updated
                            ? new Date(item.last_updated).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Status config (shared) ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string; order: number }> = {
  with_benchmark_highest: {
    label: "Muito Acima",
    className: "bg-red-500/15 text-red-700 border-red-500/30",
    order: 0,
  },
  with_benchmark_high: {
    label: "Acima",
    className: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    order: 1,
  },
  no_benchmark_ok: {
    label: "Competitivo",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    order: 2,
  },
  no_benchmark_lowest: {
    label: "Abaixo",
    className: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    order: 3,
  },
};

// ── Tab: Referências de Preços ────────────────────────────────────────────────

function ReferenciasPreccos({
  references,
  loading,
  isRealData,
}: {
  references: MLPriceReference[];
  loading: boolean;
  isRealData: boolean;
}) {
  const [filter, setFilter] = useState("all");

  const getStatusConfig = (status: string) =>
    STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground", order: 99 };

  // Ordena: piores primeiro (Muito Acima → Acima → Competitivo → Abaixo)
  const sorted = [...references].sort(
    (a, b) => (getStatusConfig(a.status).order) - (getStatusConfig(b.status).order),
  );

  const filtered = filter === "all" ? sorted : sorted.filter((r) => r.status === filter);

  const counts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map((k) => [k, references.filter((r) => r.status === k).length]),
  );

  const diffColor = (ref: MLPriceReference) => {
    if (ref.status === "with_benchmark_highest" || ref.status === "with_benchmark_high")
      return "text-destructive";
    if (ref.status === "no_benchmark_lowest") return "text-blue-600";
    return "text-emerald-600";
  };

  // Chart: preço atual vs sugerido vs menor concorrente
  const chartData = sorted.slice(0, 8).map((r) => ({
    name: r.title.length > 14 ? r.title.substring(0, 14) + "…" : r.title,
    atual: r.current_price,
    sugerido: r.suggested_price ?? 0,
    menor: r.lowest_price ?? 0,
  }));

  const hasChart = sorted.some((r) => r.suggested_price != null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <RealDataBadge isRealData={isRealData} />
        {isRealData && (
          <p className="text-xs text-muted-foreground">
            Recomendações de preço competitivo geradas pela API do Mercado Livre.
          </p>
        )}
      </div>

      {/* Info banner */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-3 pb-3 px-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
            <span className="text-xs text-blue-700">
              Recomendações baseadas em produtos similares, histórico de vendas e demanda —
              preços competitivos aumentam a visibilidade nos resultados de busca.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      {!loading && references.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = counts[key] ?? 0;
            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all ${
                  filter === key ? "ring-2 ring-primary" : "hover:bg-muted/30"
                }`}
                onClick={() => setFilter(filter === key ? "all" : key)}
              >
                <CardContent className="pt-3 pb-3 px-4">
                  <p className="text-2xl font-bold">{count}</p>
                  <Badge className={`text-[10px] mt-1 ${cfg.className}`}>{cfg.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filter pills */}
      {!loading && references.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("all")}
          >
            Todos ({references.length})
          </Button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) =>
            counts[key] > 0 ? (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilter(filter === key ? "all" : key)}
              >
                {cfg.label} ({counts[key]})
              </Button>
            ) : null,
          )}
        </div>
      )}

      {/* Comparison chart */}
      {hasChart && !loading && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Preço Atual vs Sugerido</CardTitle>
            <CardDescription className="text-xs">
              Comparativo dos primeiros {Math.min(sorted.length, 8)} produtos (pior posicionamento primeiro)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={2} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <RechartsTooltip
                  formatter={(v: number, name: string) => [
                    currFmt(v),
                    name === "atual" ? "Preço Atual" : name === "sugerido" ? "Sugerido" : "Menor Concorrente",
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend
                  formatter={(v) =>
                    v === "atual" ? "Preço Atual" : v === "sugerido" ? "Sugerido" : "Menor Concorrente"
                  }
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="atual" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                {sorted.some((r) => r.suggested_price != null) && (
                  <Bar dataKey="sugerido" fill="#22c55e" radius={[3, 3, 0, 0]} />
                )}
                {sorted.some((r) => r.lowest_price != null) && (
                  <Bar dataKey="menor" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Análise Competitiva de Preços</CardTitle>
          <CardDescription className="text-xs">
            {filter !== "all"
              ? `Filtrado: ${STATUS_CONFIG[filter]?.label ?? filter} — ${filtered.length} produto${filtered.length !== 1 ? "s" : ""}`
              : "Compare seu preço atual com a recomendação do Mercado Livre"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Produto</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Posição</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Preço Atual</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Sugerido</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Menor Conc.</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Diferença</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Comissão+Frete</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filtered.length === 0
                  ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          {references.length === 0
                            ? "Nenhuma referência de preço disponível para seus anúncios."
                            : "Nenhum produto neste filtro."}
                        </td>
                      </tr>
                    )
                  : filtered.map((ref) => {
                      const cfg = getStatusConfig(ref.status);
                      const totalFees = ref.selling_fees + ref.shipping_fees;
                      return (
                        <tr key={ref.item_id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {ref.thumbnail && (
                                <img
                                  src={ref.thumbnail}
                                  alt=""
                                  className="w-8 h-8 object-contain rounded shrink-0 bg-muted"
                                />
                              )}
                              <div>
                                <p className="font-medium line-clamp-1 text-foreground leading-tight">
                                  {ref.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">{ref.item_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                            {ref.applicable_suggestion && (
                              <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                                Aplicável
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium">
                            {currFmt(ref.current_price)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {ref.suggested_price != null ? (
                              <span className="font-semibold text-emerald-600">
                                {currFmt(ref.suggested_price)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {ref.lowest_price != null ? currFmt(ref.lowest_price) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-semibold tabular-nums flex items-center justify-end gap-1 ${diffColor(ref)}`}>
                              {ref.percent_difference > 0
                                ? <TrendingUp className="w-3.5 h-3.5" />
                                : ref.percent_difference < 0
                                ? <TrendingDown className="w-3.5 h-3.5" />
                                : null}
                              {ref.percent_difference > 0 ? "+" : ""}
                              {ref.percent_difference.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-destructive">
                            {totalFees > 0 ? currFmt(totalFees) : "—"}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Calculadora ──────────────────────────────────────────────────────────

const LOGISTIC_OPTIONS = [
  { value: "drop_off",    label: "Drop Off (ME2)",       shipping_mode: "me2" },
  { value: "fulfillment", label: "Full (Fulfillment)",   shipping_mode: "me2" },
  { value: "self_service",label: "Flex (Self Service)",  shipping_mode: "me2" },
  { value: "custom",      label: "Envio próprio",        shipping_mode: "custom" },
];

const LOGISTIC_ESTIMATE: Record<string, number> = {
  fulfillment: 8.5, drop_off: 6.0, self_service: 5.0, custom: 0,
};

interface CalcResult {
  listing_type_id: string;
  listing_name: string;
  sale_price: number;
  commission_pct: number;
  commission_value: number;
  fixed_fee: number;
  shipping_cost: number;
  total_deductions: number;
  net_revenue: number;
  profit: number;
  margin_pct: number;
  break_even: number;
}

function Calculadora({
  fetchCosts,
  connected,
}: {
  fetchCosts: UseMLPrecosCustosResult["fetchCosts"];
  connected: boolean;
}) {
  const [productCost, setProductCost] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [logisticType, setLogisticType] = useState("drop_off");
  const [shippingCostInput, setShippingCostInput] = useState("");
  const [targetMargin, setTargetMargin] = useState("");
  const [results, setResults] = useState<CalcResult[] | null>(null);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const marginColor = (pct: number) => {
    if (pct >= 20) return "text-emerald-600";
    if (pct >= 10) return "text-amber-600";
    return "text-destructive";
  };

  const logisticOpt = LOGISTIC_OPTIONS.find((o) => o.value === logisticType);

  const calculate = useCallback(async () => {
    const cost = parseFloat(productCost.replace(",", ".")) || 0;
    const price = parseFloat(salePrice.replace(",", ".")) || 0;
    if (price <= 0) return;

    setCalculating(true);
    try {
      let costs: MLListingCost[] = [];

      if (connected) {
        costs = await fetchCosts({
          price,
          logisticType,
          shippingMode: logisticOpt?.shipping_mode,
        });
      }

      if (costs.length === 0) {
        costs = [
          { listing_type_id: "gold_pro",     listing_type_name: "Premium",  listing_exposure: "highest", percentage_fee: 16, fixed_fee: 6, financing_add_on_fee: 23, sale_fee_amount: 0, currency_id: "BRL" },
          { listing_type_id: "gold_special", listing_type_name: "Clássica", listing_exposure: "highest", percentage_fee: 12, fixed_fee: 6, financing_add_on_fee: 0,  sale_fee_amount: 0, currency_id: "BRL" },
        ];
      }

      const shippingCost = shippingCostInput
        ? parseFloat(shippingCostInput.replace(",", ".")) || 0
        : (LOGISTIC_ESTIMATE[logisticType] ?? 0);

      const calc: CalcResult[] = costs
        .filter((c) => ["gold_pro", "gold_special"].includes(c.listing_type_id))
        .map((c) => {
          const commission_value = price * (c.percentage_fee / 100);
          const total_deductions = commission_value + c.fixed_fee + shippingCost;
          const net_revenue = price - total_deductions;
          const profit = net_revenue - cost;
          const margin_pct = price > 0 ? (profit / price) * 100 : 0;
          // Ponto de equilíbrio: preço mínimo para lucro zero
          // price = cost + commission_pct/100 * price + fixed_fee + shipping
          // price * (1 - commission_pct/100) = cost + fixed_fee + shipping
          const break_even = cost > 0
            ? (cost + c.fixed_fee + shippingCost) / (1 - c.percentage_fee / 100)
            : 0;
          return {
            listing_type_id: c.listing_type_id,
            listing_name: c.listing_type_name,
            sale_price: price,
            commission_pct: c.percentage_fee,
            commission_value,
            fixed_fee: c.fixed_fee,
            shipping_cost: shippingCost,
            total_deductions,
            net_revenue,
            profit,
            margin_pct,
            break_even,
          };
        });

      setResults(calc);
    } finally {
      setCalculating(false);
    }
  }, [productCost, salePrice, logisticType, shippingCostInput, fetchCosts, connected, logisticOpt]);

  // Calculadora reversa: preço mínimo para atingir margem desejada
  const reverseCalc = useCallback(
    (targetPct: number, r: CalcResult) => {
      // margin = (price - cost - commission_pct/100*price - fixed_fee - shipping) / price
      // targetPct/100 = (price*(1 - commission_pct/100) - cost - fixed_fee - shipping) / price
      // price * (1 - commission_pct/100 - targetPct/100) = cost + fixed_fee + shipping
      const cost = parseFloat(productCost.replace(",", ".")) || 0;
      const denom = 1 - r.commission_pct / 100 - targetPct / 100;
      if (denom <= 0) return null;
      return (cost + r.fixed_fee + r.shipping_cost) / denom;
    },
    [productCost],
  );

  const target = parseFloat(targetMargin.replace(",", ".")) || 0;

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Simulador de Precificação
          </CardTitle>
          <CardDescription className="text-xs">
            {connected
              ? "Comissões calculadas em tempo real pela API do Mercado Livre."
              : "Usando taxas estimadas — conecte sua conta para valores precisos."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="product-cost" className="text-xs">Custo do produto (R$)</Label>
              <Input
                id="product-cost"
                placeholder="0,00"
                value={productCost}
                onChange={(e) => setProductCost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-price" className="text-xs">Preço de venda (R$)</Label>
              <Input
                id="sale-price"
                placeholder="0,00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Logística</Label>
              <Select value={logisticType} onValueChange={setLogisticType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOGISTIC_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shipping-cost" className="text-xs flex items-center gap-1">
                Custo de envio (R$)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 cursor-help text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Deixe em branco para usar estimativa por tipo de logística
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="shipping-cost"
                placeholder="Estimativa automática"
                value={shippingCostInput}
                onChange={(e) => setShippingCostInput(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={calculate} disabled={calculating} className="w-full sm:w-auto gap-1.5">
            {calculating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            {calculating ? "Calculando..." : "Calcular"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Resultado por tipo de anúncio
            </p>
            {connected && (
              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs">
                <CheckCircle2 className="w-3 h-3" /> Comissões reais
              </Badge>
            )}
          </div>

          {results.map((r) => (
            <Card
              key={r.listing_type_id}
              className={r.listing_type_id === "gold_pro" ? "border-yellow-500/40" : ""}
            >
              <CardContent className="pt-4 pb-3 px-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{r.listing_name}</span>
                    {r.listing_type_id === "gold_pro" && (
                      <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30 text-xs">
                        Recomendado
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Lucro</p>
                      <p className={`font-bold text-sm tabular-nums ${marginColor(r.margin_pct)}`}>
                        {currFmt(r.profit)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Margem</p>
                      <p className={`font-bold text-sm ${marginColor(r.margin_pct)}`}>
                        {pctFmt(r.margin_pct)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                      onClick={() =>
                        setShowDetail(showDetail === r.listing_type_id ? null : r.listing_type_id)
                      }
                    >
                      {showDetail === r.listing_type_id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Break-even indicator */}
                {r.break_even > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Ponto de equilíbrio:{" "}
                    <span
                      className={`font-semibold ${
                        r.sale_price >= r.break_even ? "text-emerald-600" : "text-destructive"
                      }`}
                    >
                      {currFmt(r.break_even)}
                    </span>
                    {r.sale_price < r.break_even && (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1 py-0">
                        Prejuízo
                      </Badge>
                    )}
                  </div>
                )}

                {/* Detailed breakdown */}
                {showDetail === r.listing_type_id && (
                  <div className="mt-3 pt-3 border-t space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Preço de venda</span>
                      <span className="tabular-nums font-medium">{currFmt(r.sale_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">
                        Comissão ({pctFmt(r.commission_pct)})
                      </span>
                      <span className="tabular-nums text-destructive">
                        -{currFmt(r.commission_value)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Taxa fixa</span>
                      <span className="tabular-nums text-destructive">-{currFmt(r.fixed_fee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Custo de envio</span>
                      <span className="tabular-nums text-destructive">
                        -{currFmt(r.shipping_cost)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Receita líquida</span>
                      <span className="tabular-nums font-semibold">{currFmt(r.net_revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Custo do produto</span>
                      <span className="tabular-nums text-destructive">
                        -{currFmt(parseFloat(productCost.replace(",", ".") || "0"))}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span className="text-xs">Lucro líquido</span>
                      <span className={`tabular-nums ${marginColor(r.margin_pct)}`}>
                        {currFmt(r.profit)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Margin comparison chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Comparativo de Margem por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={results.map((r) => ({
                    name: r.listing_name,
                    margem: parseFloat(r.margin_pct.toFixed(1)),
                  }))}
                  barSize={40}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <RechartsTooltip
                    formatter={(v: number) => [`${v}%`, "Margem"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="margem" radius={[4, 4, 0, 0]}>
                    {results.map((r, i) => (
                      <Cell
                        key={i}
                        fill={
                          r.margin_pct >= 20 ? "#22c55e" : r.margin_pct >= 10 ? "#f59e0b" : "#ef4444"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reverse calculator */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Calculadora Reversa
              </CardTitle>
              <CardDescription className="text-xs">
                Descubra o preço mínimo de venda para atingir a margem desejada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="space-y-1.5 w-48">
                  <Label htmlFor="target-margin" className="text-xs">Margem desejada (%)</Label>
                  <Input
                    id="target-margin"
                    placeholder="Ex: 20"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(e.target.value)}
                  />
                </div>
              </div>

              {target > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.map((r) => {
                    const minPrice = reverseCalc(target, r);
                    return (
                      <div
                        key={r.listing_type_id}
                        className="rounded-lg border bg-muted/30 px-4 py-3"
                      >
                        <p className="text-xs text-muted-foreground font-medium">{r.listing_name}</p>
                        {minPrice != null ? (
                          <>
                            <p className="text-xl font-bold tabular-nums mt-1">
                              {currFmt(minPrice)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Preço mínimo para {pctFmt(target)} de margem
                            </p>
                            {r.sale_price > 0 && (
                              <Badge
                                className={`mt-1.5 text-[10px] ${
                                  r.sale_price >= minPrice
                                    ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                    : "bg-destructive/10 text-destructive border-destructive/20"
                                }`}
                              >
                                {r.sale_price >= minPrice
                                  ? `Seu preço cobre (+${currFmt(r.sale_price - minPrice)})`
                                  : `Abaixo do necessário (-${currFmt(minPrice - r.sale_price)})`}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-destructive mt-1">
                            Margem inviável com esta comissão.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {target <= 0 && (
                <p className="text-xs text-muted-foreground">
                  Insira a margem desejada acima para ver o preço mínimo necessário.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MLPrecosCustos() {
  const {
    items,
    itemsTotal,
    references,
    loading,
    isRealData,
    connected,
    refresh,
    refreshing,
    fetchCosts,
  } = useMLPrecosCustos();

  if (!connected) {
    return (
      <div className="space-y-6">
        <MLPageHeader title="Preços e Custos" lastUpdated={null} />
        <NotConnected />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MLPageHeader title="Preços e Custos" lastUpdated={null}>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Atualizando…" : "Atualizar"}
        </Button>
      </MLPageHeader>

      <Tabs defaultValue="precos">
        <TabsList className="h-9">
          <TabsTrigger value="precos" className="gap-1.5 text-xs">
            <Tag className="w-3.5 h-3.5" /> Preços
            {itemsTotal > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {itemsTotal}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="referencias" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Referências
            {references.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {references.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calculadora" className="gap-1.5 text-xs">
            <Calculator className="w-3.5 h-3.5" /> Calculadora
          </TabsTrigger>
        </TabsList>

        <TabsContent value="precos" className="mt-5">
          <PrecosProdutos items={items} loading={loading} isRealData={isRealData} />
        </TabsContent>
        <TabsContent value="referencias" className="mt-5">
          <ReferenciasPreccos references={references} loading={loading} isRealData={isRealData} />
        </TabsContent>
        <TabsContent value="calculadora" className="mt-5">
          <Calculadora fetchCosts={fetchCosts} connected={connected} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
