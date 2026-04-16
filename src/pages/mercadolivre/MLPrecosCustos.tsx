import { useState, useCallback, useRef, useEffect } from "react";
import {
  Calculator, BarChart3, Plug, RefreshCw, Info, ChevronDown, ChevronUp,
  CheckCircle2, TrendingDown, TrendingUp, Search, X, AlertCircle,
  Tag, Lightbulb,
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
  type MLItemSuggestion,
} from "@/hooks/useMLPrecosCustos";
import type { UseMLPrecosCustosResult } from "@/hooks/useMLPrecosCustos";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  ReferenceLine, Legend,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────

const currFmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const pctFmt = (v: number) => `${v.toFixed(1)}%`;

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; color: string; icon: JSX.Element; advice: (s: MLItemSuggestion) => string }
> = {
  with_benchmark_highest: {
    label: "Muito Acima do Mercado",
    badgeClass: "bg-red-500/15 text-red-700 border-red-500/30",
    color: "#ef4444",
    icon: <TrendingUp className="w-4 h-4 text-red-600" />,
    advice: (s) =>
      `Seu preço está ${Math.abs(s.percent_difference).toFixed(0)}% acima dos concorrentes. Reduzir para ${s.suggested_price ? currFmt(s.suggested_price) : "o preço sugerido"} pode aumentar significativamente a visibilidade e as chances de venda.`,
  },
  with_benchmark_high: {
    label: "Acima do Mercado",
    badgeClass: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    color: "#f59e0b",
    icon: <TrendingUp className="w-4 h-4 text-amber-600" />,
    advice: (s) =>
      `Seu preço está ${Math.abs(s.percent_difference).toFixed(0)}% acima da média. Uma pequena redução${s.suggested_price ? ` para ${currFmt(s.suggested_price)}` : ""} pode melhorar o posicionamento nos resultados de busca.`,
  },
  no_benchmark_ok: {
    label: "Preço Competitivo",
    badgeClass: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    color: "#22c55e",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    advice: () =>
      "Seu preço está alinhado com o mercado. Mantenha a estratégia atual e monitore os concorrentes periodicamente.",
  },
  no_benchmark_lowest: {
    label: "Abaixo do Mercado",
    badgeClass: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    color: "#3b82f6",
    icon: <TrendingDown className="w-4 h-4 text-blue-600" />,
    advice: (s) =>
      `Seu preço está abaixo da média dos concorrentes. Você pode aumentar a margem${s.suggested_price && s.suggested_price > s.current_price ? ` para até ${currFmt(s.suggested_price)}` : ""} sem perder competitividade.`,
  },
};

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

// ── Product Picker ────────────────────────────────────────────────────────────

function ProductPicker({
  items,
  selected,
  onSelect,
  loading,
}: {
  items: MLItemPrice[];
  selected: MLItemPrice | null;
  onSelect: (item: MLItemPrice | null) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayValue = selected && !open ? selected.title : search;

  const filtered = items
    .filter(
      (item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.item_id.toLowerCase().includes(search.toLowerCase()),
    )
    .slice(0, 8);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9 pr-9"
          placeholder={
            loading ? "Carregando produtos..." : "Busque um produto pelo título ou ID..."
          }
          disabled={loading || items.length === 0}
          value={displayValue}
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
        />
        {selected && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              onSelect(null);
              setSearch("");
              setOpen(false);
            }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-background border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item.item_id}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 text-left transition-colors"
              onClick={() => {
                onSelect(item);
                setSearch("");
                setOpen(false);
              }}
            >
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-9 h-9 object-contain rounded bg-muted shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded bg-muted shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.item_id} · {currFmt(item.price_standard)}
                </p>
              </div>
            </button>
          ))}
          {items.length > 8 && (
            <p className="px-3 py-2 text-xs text-muted-foreground text-center border-t">
              {items.length - 8} produtos adicionais — refine a busca
            </p>
          )}
        </div>
      )}

      {open && search.length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-background border rounded-lg shadow-lg px-3 py-4 text-center text-sm text-muted-foreground">
          Nenhum produto encontrado para "{search}"
        </div>
      )}
    </div>
  );
}

// ── Tab: Referências de Preços ────────────────────────────────────────────────

function ReferenciasPreccos({
  items,
  loadingItems,
  fetchItemSuggestion,
}: {
  items: MLItemPrice[];
  loadingItems: boolean;
  fetchItemSuggestion: UseMLPrecosCustosResult["fetchItemSuggestion"];
}) {
  const [selectedItem, setSelectedItem] = useState<MLItemPrice | null>(null);
  const [suggestion, setSuggestion] = useState<MLItemSuggestion | null>(null);
  const [noSuggestion, setNoSuggestion] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const handleSelectItem = useCallback(
    async (item: MLItemPrice | null) => {
      setSelectedItem(item);
      setSuggestion(null);
      setNoSuggestion(false);
      if (!item) return;

      setLoadingSuggestion(true);
      try {
        const result = await fetchItemSuggestion(item.item_id);
        setSuggestion(result.suggestion);
        setNoSuggestion(result.no_suggestion);
      } finally {
        setLoadingSuggestion(false);
      }
    },
    [fetchItemSuggestion],
  );

  const statusCfg = suggestion ? (STATUS_CONFIG[suggestion.status] ?? STATUS_CONFIG.no_benchmark_ok) : null;

  // Gráfico de distribuição de preços dos concorrentes
  const graphData = suggestion?.graph
    ? [...suggestion.graph]
        .sort((a, b) => a.price.amount - b.price.amount)
        .map((entry, i) => ({
          label: `Conc. ${i + 1}`,
          title: entry.info.title ?? `Concorrente ${i + 1}`,
          preco: entry.price.amount,
          vendas: entry.info.sold_quantity ?? 0,
        }))
    : [];

  // Preço mais popular entre concorrentes (maior sold_quantity)
  const mostSoldCompetitor = graphData.length
    ? graphData.reduce((best, cur) => (cur.vendas > best.vendas ? cur : best), graphData[0])
    : null;

  return (
    <div className="space-y-5">
      {/* Picker */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Selecione um produto para analisar</p>
        <ProductPicker
          items={items}
          selected={selectedItem}
          onSelect={handleSelectItem}
          loading={loadingItems}
        />
        {items.length > 0 && !selectedItem && (
          <p className="text-xs text-muted-foreground">
            {items.length} anúncios ativos disponíveis para análise
          </p>
        )}
      </div>

      {/* Empty state */}
      {!selectedItem && !loadingItems && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Selecione um produto acima para ver a análise competitiva de preços, os concorrentes
              e a sugestão do Mercado Livre.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loadingSuggestion && selectedItem && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      )}

      {/* No suggestion available */}
      {noSuggestion && selectedItem && !loadingSuggestion && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-4 pb-4">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Sem referência disponível para este produto
              </p>
              <p className="text-xs text-amber-700 mt-1">
                O Mercado Livre ainda não gerou sugestões competitivas para este anúncio.
                Tente outro produto ou aguarde que o ML processe mais dados de mercado.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail view */}
      {suggestion && selectedItem && !loadingSuggestion && statusCfg && (
        <div className="space-y-4">
          {/* Product header */}
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                {selectedItem.thumbnail && (
                  <img
                    src={selectedItem.thumbnail}
                    alt=""
                    className="w-14 h-14 object-contain rounded-lg bg-muted shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold line-clamp-2 leading-tight">{selectedItem.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedItem.item_id}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge className={`text-xs gap-1 ${statusCfg.badgeClass}`}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </Badge>
                    {suggestion.applicable_suggestion && (
                      <Badge className="text-xs bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                        Sugestão aplicável
                      </Badge>
                    )}
                    {suggestion.compared_values > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {suggestion.compared_values} produto{suggestion.compared_values !== 1 ? "s" : ""} analisado{suggestion.compared_values !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price comparison KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground font-medium">Seu Preço Atual</p>
                <p className="text-2xl font-bold tabular-nums mt-1">
                  {currFmt(suggestion.current_price)}
                </p>
                {suggestion.percent_difference !== 0 && (
                  <p className={`text-xs mt-1 font-medium ${
                    suggestion.percent_difference > 0 ? "text-destructive" : "text-emerald-600"
                  }`}>
                    {suggestion.percent_difference > 0 ? "+" : ""}
                    {suggestion.percent_difference.toFixed(1)}% vs mercado
                  </p>
                )}
              </CardContent>
            </Card>

            <Card
              className={
                suggestion.suggested_price != null
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : ""
              }
            >
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground font-medium">Preço Sugerido ML</p>
                {suggestion.suggested_price != null ? (
                  <>
                    <p className="text-2xl font-bold tabular-nums mt-1 text-emerald-700">
                      {currFmt(suggestion.suggested_price)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recomendação do Mercado Livre
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">Não disponível</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground font-medium">Menor Concorrente</p>
                {suggestion.lowest_price != null ? (
                  <>
                    <p className="text-2xl font-bold tabular-nums mt-1 text-blue-700">
                      {currFmt(suggestion.lowest_price)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Menor preço no mercado</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">Não disponível</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommendation */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary">Sugestão de Precificação</p>
                  <p className="text-sm mt-1 text-foreground/80">
                    {statusCfg.advice(suggestion)}
                  </p>
                  {(suggestion.selling_fees > 0 || suggestion.shipping_fees > 0) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Custos estimados para este anúncio:{" "}
                      {suggestion.selling_fees > 0 && (
                        <span className="font-medium">comissão {currFmt(suggestion.selling_fees)}</span>
                      )}
                      {suggestion.selling_fees > 0 && suggestion.shipping_fees > 0 && " + "}
                      {suggestion.shipping_fees > 0 && (
                        <span className="font-medium">frete {currFmt(suggestion.shipping_fees)}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competitor price distribution chart */}
          {graphData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Distribuição de Preços dos Concorrentes
                </CardTitle>
                <CardDescription className="text-xs">
                  Barras = unidades vendidas por faixa de preço
                  {mostSoldCompetitor && (
                    <> · Mais vendido: <span className="font-medium">{currFmt(mostSoldCompetitor.preco)}</span> ({mostSoldCompetitor.vendas} vendas)</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={graphData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="preco"
                      tickFormatter={(v) => `R$${v}`}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{ value: "Vendas", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg px-3 py-2 shadow text-xs">
                            <p className="font-semibold line-clamp-1 max-w-[180px]">{d.title}</p>
                            <p className="text-muted-foreground">Preço: {currFmt(d.preco)}</p>
                            <p className="text-muted-foreground">Vendas: {d.vendas}</p>
                          </div>
                        );
                      }}
                    />
                    {/* Linhas de referência */}
                    <ReferenceLine
                      x={suggestion.current_price}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      label={{ value: "Seu preço", position: "top", style: { fontSize: 10, fill: "#f59e0b" } }}
                    />
                    {suggestion.suggested_price != null && (
                      <ReferenceLine
                        x={suggestion.suggested_price}
                        stroke="#22c55e"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        label={{ value: "Sugerido", position: "top", style: { fontSize: 10, fill: "#22c55e" } }}
                      />
                    )}
                    <Bar dataKey="vendas" radius={[4, 4, 0, 0]}>
                      {graphData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.preco === mostSoldCompetitor?.preco
                              ? "#6366f1"
                              : "hsl(var(--muted-foreground) / 0.4)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-3 h-0.5 bg-amber-500" style={{ borderTop: "2px dashed" }} />
                    Seu preço ({currFmt(suggestion.current_price)})
                  </div>
                  {suggestion.suggested_price != null && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-3 h-0.5 bg-emerald-500" />
                      Sugerido ({currFmt(suggestion.suggested_price)})
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-3 h-3 rounded-sm bg-indigo-500 shrink-0" />
                    Mais vendido
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Competitor table */}
          {graphData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Produtos Concorrentes</CardTitle>
                <CardDescription className="text-xs">
                  Ordenados pelo menor preço
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                          Produto
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                          Preço
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                          Vendas
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                          vs Seu Preço
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {graphData.map((entry, i) => {
                        const diff = ((entry.preco - suggestion.current_price) / suggestion.current_price) * 100;
                        return (
                          <tr key={i} className="border-b hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5">
                              <p className="text-xs line-clamp-1">{entry.title}</p>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                              {currFmt(entry.preco)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                              {entry.vendas > 0 ? entry.vendas : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span
                                className={`text-xs font-medium tabular-nums ${
                                  diff < 0
                                    ? "text-emerald-600"
                                    : diff > 0
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {diff > 0 ? "+" : ""}
                                {diff.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
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

  const reverseCalc = useCallback(
    (targetPct: number, r: CalcResult) => {
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

                {showDetail === r.listing_type_id && (
                  <div className="mt-3 pt-3 border-t space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Preço de venda</span>
                      <span className="tabular-nums font-medium">{currFmt(r.sale_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Comissão ({pctFmt(r.commission_pct)})</span>
                      <span className="tabular-nums text-destructive">-{currFmt(r.commission_value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Taxa fixa</span>
                      <span className="tabular-nums text-destructive">-{currFmt(r.fixed_fee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Custo de envio</span>
                      <span className="tabular-nums text-destructive">-{currFmt(r.shipping_cost)}</span>
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

          {/* Margin chart */}
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
              <div className="space-y-1.5 w-48">
                <Label htmlFor="target-margin" className="text-xs">Margem desejada (%)</Label>
                <Input
                  id="target-margin"
                  placeholder="Ex: 20"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(e.target.value)}
                />
              </div>

              {target > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.map((r) => {
                    const minPrice = reverseCalc(target, r);
                    return (
                      <div key={r.listing_type_id} className="rounded-lg border bg-muted/30 px-4 py-3">
                        <p className="text-xs text-muted-foreground font-medium">{r.listing_name}</p>
                        {minPrice != null ? (
                          <>
                            <p className="text-xl font-bold tabular-nums mt-1">{currFmt(minPrice)}</p>
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
              ) : (
                <p className="text-xs text-muted-foreground">
                  Insira a margem desejada para ver o preço mínimo necessário.
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
    loading,
    connected,
    refresh,
    refreshing,
    fetchItemSuggestion,
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

      <Tabs defaultValue="referencias">
        <TabsList className="h-9">
          <TabsTrigger value="referencias" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Referências de Preços
          </TabsTrigger>
          <TabsTrigger value="calculadora" className="gap-1.5 text-xs">
            <Calculator className="w-3.5 h-3.5" /> Calculadora
          </TabsTrigger>
        </TabsList>

        <TabsContent value="referencias" className="mt-5">
          <ReferenciasPreccos
            items={items}
            loadingItems={loading}
            fetchItemSuggestion={fetchItemSuggestion}
          />
        </TabsContent>
        <TabsContent value="calculadora" className="mt-5">
          <Calculadora fetchCosts={fetchCosts} connected={connected} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
