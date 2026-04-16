import { useState, useCallback } from "react";
import {
  Calculator, RefreshCw, Info, ChevronDown, ChevronUp,
  CheckCircle2, TrendingDown, TrendingUp, Tag, Plug,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import {
  useMLPrecosCustos,
  type MLListingCost,
} from "@/hooks/useMLPrecosCustos";
import type { UseMLPrecosCustosResult } from "@/hooks/useMLPrecosCustos";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from "recharts";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Calculadora ───────────────────────────────────────────────────────────────

const LOGISTIC_OPTIONS = [
  { value: "drop_off",     label: "Drop Off (ME2)",      shipping_mode: "me2" },
  { value: "fulfillment",  label: "Full (Fulfillment)",  shipping_mode: "me2" },
  { value: "self_service", label: "Flex (Self Service)", shipping_mode: "me2" },
  { value: "custom",       label: "Envio próprio",       shipping_mode: "custom" },
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
  const { connected, refresh, refreshing, fetchCosts } = useMLPrecosCustos();

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

      <Calculadora fetchCosts={fetchCosts} connected={connected} />
    </div>
  );
}
