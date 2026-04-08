import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, TrendingUp, Truck, Percent, Receipt,
  Info, Plug, AlertCircle, Package,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { useMLStore } from "@/contexts/MLStoreContext";
import { useSeller } from "@/contexts/SellerContext";
import {
  getFinancialDailyStats,
  getListingTypeBreakdown,
  getShippingBreakdown,
  computeFinancialSummary,
  type FinancialDailyStat,
} from "@/data/financialMockData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numFmt = (v: number) => v.toLocaleString("pt-BR");
const pctFmt = (v: number) => `${v.toFixed(1)}%`;

const QUICK_RANGES = [
  { label: "7 dias",  days: 7  },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
] as const;

// Tooltip personalizado para o gráfico empilhado
const StackedTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: p.fill ?? p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-medium tabular-nums">{currFmt(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-border/60 pt-1.5 flex justify-between">
        <span className="text-muted-foreground">Receita Bruta</span>
        <span className="font-semibold tabular-nums">{currFmt(total)}</span>
      </div>
    </div>
  );
};

// ─── Not connected ────────────────────────────────────────────────────────────

function NotConnected() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Plug className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Mercado Livre não conectado</h2>
        <p className="text-muted-foreground text-sm">Conecte sua conta para visualizar a análise financeira.</p>
        <Button asChild><Link to="/integracoes">Ir para Integrações</Link></Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MLFinanceiro() {
  const [selectedDays, setSelectedDays] = useState(30);
  const { stores, salesCache, loading: storeLoading } = useMLStore();
  const { selectedSeller, selectedStoreIds } = useSeller();

  const connected = stores.length > 0;

  // Effective store id for seeding
  const storeId = useMemo(() => {
    if (stores.length > 0) return stores[0].ml_user_id;
    if (selectedSeller?.id) return selectedSeller.id;
    return "default";
  }, [stores, selectedSeller]);

  // Use real sales cache if available, otherwise pure mock
  const revenueByDay = useMemo(() => {
    if (salesCache.daily.length > 0) {
      const cutoff = format(subDays(new Date(), selectedDays - 1), "yyyy-MM-dd");
      return salesCache.daily
        .filter((d) => d.date >= cutoff)
        .map((d) => ({ date: d.date, total: d.total, qty: d.qty }));
    }
    return undefined;
  }, [salesCache.daily, selectedDays]);

  // Generate financial daily stats (fees estimated on top of real/mock revenue)
  const financialDaily = useMemo(
    () => getFinancialDailyStats(storeId, selectedDays, revenueByDay),
    [storeId, selectedDays, revenueByDay],
  );

  const summary = useMemo(() => computeFinancialSummary(financialDaily), [financialDaily]);
  const listingBreakdown = useMemo(
    () => getListingTypeBreakdown(storeId, financialDaily),
    [storeId, financialDaily],
  );
  const shippingBreakdown = useMemo(() => getShippingBreakdown(financialDaily), [financialDaily]);

  // Is this real data or pure mock?
  const isRealRevenue = salesCache.daily.length > 0;

  // Chart data: stacked bar for revenue composition
  const chartData = useMemo(
    () =>
      financialDaily.map((d) => ({
        label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
        date: d.date,
        "Receita Líquida": Math.max(0, d.net_revenue),
        "Comissão ML": d.ml_commission,
        "Frete (vendedor)": d.shipping_cost,
        "Margem %": d.gross_revenue > 0
          ? Math.round((d.net_revenue / d.gross_revenue) * 1000) / 10
          : 0,
      })),
    [financialDaily],
  );

  if (!storeLoading && !connected) return <NotConnected />;

  if (storeLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="sticky -top-8 z-20 -mx-8 -mt-8 px-8 pb-4 pt-4 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <MLPageHeader title="Financeiro" lastUpdated={isRealRevenue ? new Date() : null}>
          {!isRealRevenue && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 cursor-help">
                  <Info className="h-3 w-3" />
                  Dados simulados
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                A receita bruta usa dados simulados. As taxas de comissão e frete são estimativas baseadas nas tabelas oficiais do ML. Sincronize os pedidos para dados exatos.
              </TooltipContent>
            </Tooltip>
          )}
          {isRealRevenue && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 cursor-help">
                  <Info className="h-3 w-3" />
                  Receita real · Taxas estimadas
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                A receita bruta vem dos dados sincronizados. As taxas de comissão e frete são estimativas — para valores exatos, use o relatório de vendas do ML.
              </TooltipContent>
            </Tooltip>
          )}
        </MLPageHeader>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-1.5">
        {QUICK_RANGES.map((r) => (
          <Button
            key={r.days}
            size="sm"
            variant={selectedDays === r.days ? "default" : "outline"}
            className="h-7 px-3 text-xs"
            onClick={() => setSelectedDays(r.days)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          title="Receita Bruta"
          value={currFmt(summary.gross_revenue)}
          icon={<DollarSign className="w-4 h-4" />}
          subtitle={`${numFmt(summary.total_orders)} pedidos`}
          variant="minimal"
          iconClassName="bg-primary/10 text-primary"
          size="compact"
        />
        <KPICard
          title="Comissão ML"
          value={currFmt(summary.ml_commission)}
          icon={<Receipt className="w-4 h-4" />}
          subtitle={`~${pctFmt(summary.avg_commission_rate)} da receita`}
          variant="minimal"
          iconClassName="bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"
          size="compact"
        />
        <KPICard
          title="Custo de Frete"
          value={currFmt(summary.shipping_cost)}
          icon={<Truck className="w-4 h-4" />}
          subtitle={`${numFmt(shippingBreakdown.free_shipping_orders)} envios grátis`}
          variant="minimal"
          iconClassName="bg-accent/10 text-accent"
          size="compact"
        />
        <KPICard
          title="Receita Líquida"
          value={currFmt(summary.net_revenue)}
          icon={<TrendingUp className="w-4 h-4" />}
          subtitle="após comissão e frete"
          variant="minimal"
          iconClassName="bg-success/10 text-success"
          size="compact"
        />
        <KPICard
          title="Margem Operacional"
          value={pctFmt(summary.net_margin_pct)}
          icon={<Percent className="w-4 h-4" />}
          subtitle="líquida s/ CMV"
          variant="minimal"
          iconClassName={summary.net_margin_pct >= 70 ? "bg-success/10 text-success" : summary.net_margin_pct >= 55 ? "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]" : "bg-destructive/10 text-destructive"}
          size="compact"
        />
      </div>

      {/* ── Revenue Composition Chart ── */}
      <Card>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm font-medium text-foreground">Composição da Receita por Dia</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Receita Líquida</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />Comissão ML</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />Frete</span>
            </div>
          </div>
        </div>
        <CardContent className="px-4 pb-2 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={selectedDays <= 7 ? 0 : selectedDays <= 15 ? 1 : Math.floor(chartData.length / 7)}
              />
              <YAxis
                yAxisId="brl"
                tickFormatter={(v) => `R$${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}k`}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={54}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={36}
                domain={[0, 100]}
              />
              <RechartsTooltip content={<StackedTooltip />} />
              <Bar yAxisId="brl" dataKey="Receita Líquida" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={32} />
              <Bar yAxisId="brl" dataKey="Comissão ML"     stackId="a" fill="#f59e0b" maxBarSize={32} />
              <Bar yAxisId="brl" dataKey="Frete (vendedor)" stackId="a" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Line yAxisId="pct" type="monotone" dataKey="Margem %" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="4 2" name="Margem %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Breakdown cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Listing type fees */}
        <Card>
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Comissão por Tipo de Anúncio</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="text-xs max-w-xs">
                  Clássico: 11,5% · Premium: 16,5% · Grátis: 0%<br />
                  Baseado na tabela oficial do Mercado Livre.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {["Tipo", "Taxa", "Pedidos", "Receita", "Comissão"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listingBreakdown.map((row, i) => (
                  <tr key={row.type} className={`border-b border-border/40 last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3 pl-5">
                      <Badge
                        className={
                          row.type === "classic"
                            ? "bg-blue-500/15 text-blue-600 border-blue-500/30"
                            : row.type === "premium"
                            ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                            : "bg-gray-500/15 text-gray-500 border-gray-500/30"
                        }
                      >
                        {row.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums font-mono text-xs">
                      {row.rate === 0 ? "—" : pctFmt(row.rate * 100)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{numFmt(row.orders)}</td>
                    <td className="px-4 py-3 tabular-nums">{currFmt(row.gross_revenue)}</td>
                    <td className="px-4 py-3 pr-5 tabular-nums font-medium text-amber-600">
                      {row.commission === 0 ? <span className="text-muted-foreground">—</span> : currFmt(row.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/20 border-t border-border/60">
                  <td colSpan={2} className="px-4 py-2.5 pl-5 text-xs font-semibold text-muted-foreground">Total</td>
                  <td className="px-4 py-2.5 tabular-nums text-xs font-semibold">{numFmt(listingBreakdown.reduce((s, r) => s + r.orders, 0))}</td>
                  <td className="px-4 py-2.5 tabular-nums text-xs font-semibold">{currFmt(listingBreakdown.reduce((s, r) => s + r.gross_revenue, 0))}</td>
                  <td className="px-4 py-2.5 pr-5 tabular-nums text-xs font-semibold text-amber-600">{currFmt(listingBreakdown.reduce((s, r) => s + r.commission, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Shipping breakdown */}
        <Card>
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Frete (Custo do Vendedor)</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="text-xs max-w-xs">
                  Custo de frete absorvido pelo vendedor via Mercado Envios (Full e Flex). Estimativa baseada na proporção de envios com "frete grátis" para o comprador.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <CardContent className="space-y-4">
            {/* Visual metric rows */}
            {[
              {
                label: "Total de pedidos enviados",
                value: numFmt(shippingBreakdown.total_shipped_orders),
                sub: null,
              },
              {
                label: "Pedidos com frete grátis (vendedor paga)",
                value: numFmt(shippingBreakdown.free_shipping_orders),
                sub: pctFmt(shippingBreakdown.free_shipping_pct) + " do total",
              },
              {
                label: "Custo total de frete",
                value: currFmt(shippingBreakdown.total_shipping_cost),
                sub: null,
                highlight: true,
              },
              {
                label: "Custo médio por envio grátis",
                value: currFmt(shippingBreakdown.avg_shipping_cost_per_order),
                sub: "via Mercado Envios",
              },
              {
                label: "% da receita bruta em frete",
                value: pctFmt(
                  summary.gross_revenue > 0
                    ? (shippingBreakdown.total_shipping_cost / summary.gross_revenue) * 100
                    : 0
                ),
                sub: null,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div>
                  <p className="text-sm text-muted-foreground">{row.label}</p>
                  {row.sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{row.sub}</p>}
                </div>
                <span className={`text-sm font-semibold tabular-nums ${row.highlight ? "text-blue-600" : ""}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      {/* ── Disclaimer ── */}
      <Card className="border-muted/60 bg-muted/20">
        <CardContent className="flex items-start gap-3 py-3 px-4">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Valores estimados.</strong>{" "}
            As taxas de comissão usam as alíquotas oficiais do Mercado Livre (Clássico 11,5% · Premium 16,5%).
            O custo de frete é estimado com base na proporção de envios com frete grátis.
            Para valores exatos por pedido, a integração com a API de pedidos será necessária (Sprint 2).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
