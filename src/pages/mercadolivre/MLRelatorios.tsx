import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock3, MapPin, CreditCard, TrendingUp, GitMerge, Info } from "lucide-react";
import { BrazilHeatMap } from "@/components/mercadolivre/BrazilHeatMap";
import { useMLStore } from "@/contexts/MLStoreContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
  AreaChart, Area,
} from "recharts";

// ─── Helpers ────────────────────────────────────────────────────────────────

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const pctFmt = (v: number) => `${v.toFixed(1)}%`;

const BRAND_COLORS = {
  primary: "#e6b422",
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  purple: "#a855f7",
  orange: "#f97316",
  cyan: "#06b6d4",
};

// Typical Brazilian e-commerce state distribution (% of orders)
const STATE_DIST: { uf: string; name: string; pct: number }[] = [
  { uf: "SP", name: "São Paulo",            pct: 30.2 },
  { uf: "RJ", name: "Rio de Janeiro",       pct: 12.8 },
  { uf: "MG", name: "Minas Gerais",         pct: 10.5 },
  { uf: "RS", name: "Rio Grande do Sul",    pct:  6.4 },
  { uf: "PR", name: "Paraná",               pct:  6.1 },
  { uf: "BA", name: "Bahia",                pct:  4.9 },
  { uf: "SC", name: "Santa Catarina",       pct:  4.3 },
  { uf: "GO", name: "Goiás",                pct:  3.1 },
  { uf: "PE", name: "Pernambuco",           pct:  2.9 },
  { uf: "CE", name: "Ceará",                pct:  2.7 },
  { uf: "DF", name: "Distrito Federal",     pct:  2.2 },
  { uf: "ES", name: "Espírito Santo",       pct:  1.8 },
  { uf: "MT", name: "Mato Grosso",          pct:  1.3 },
  { uf: "PA", name: "Pará",                 pct:  1.2 },
  { uf: "MA", name: "Maranhão",             pct:  0.9 },
  { uf: "AM", name: "Amazonas",             pct:  0.7 },
  { uf: "MS", name: "Mato Grosso do Sul",   pct:  0.7 },
  { uf: "PI", name: "Piauí",               pct:  0.5 },
  { uf: "RN", name: "Rio Grande do Norte",  pct:  0.5 },
  { uf: "PB", name: "Paraíba",             pct:  0.5 },
  { uf: "AL", name: "Alagoas",              pct:  0.4 },
  { uf: "SE", name: "Sergipe",              pct:  0.4 },
  { uf: "TO", name: "Tocantins",            pct:  0.3 },
  { uf: "RO", name: "Rondônia",            pct:  0.3 },
  { uf: "AC", name: "Acre",                pct:  0.1 },
  { uf: "AP", name: "Amapá",              pct:  0.1 },
  { uf: "RR", name: "Roraima",             pct:  0.1 },
];

// Typical ML Brazil payment distribution
const PAYMENT_DIST = [
  { name: "Cartão parcelado", pct: 38.0, color: BRAND_COLORS.blue },
  { name: "Cartão à vista",   pct: 22.0, color: BRAND_COLORS.cyan },
  { name: "Pix",              pct: 23.0, color: BRAND_COLORS.green },
  { name: "Boleto",           pct: 13.0, color: BRAND_COLORS.orange },
  { name: "Outros",           pct:  4.0, color: BRAND_COLORS.purple },
];

// ─── Simulated note ──────────────────────────────────────────────────────────

function SimNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
      <TrendingUp className="w-8 h-8 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Custom tooltip helpers ───────────────────────────────────────────────────

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.name?.toLowerCase().includes("pedido") ? p.value : currencyFmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Tab: Venda por Hora ──────────────────────────────────────────────────────

function TabHorario() {
  const { salesCache } = useMLStore();
  const { daily, hourly } = salesCache;

  const { hourlyAgg, peakHour, totalRevenue } = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      label: `${String(h).padStart(2, "0")}h`,
      hour: h,
      receita: 0,
      pedidos: 0,
    }));

    hourly.forEach((r) => {
      const b = buckets[r.hour];
      if (!b) return;
      b.receita += r.total;
      b.pedidos += r.qty;
    });

    const totalRevenue = buckets.reduce((s, b) => s + b.receita, 0);
    const peak = buckets.reduce((best, b) => (b.receita > best.receita ? b : best), buckets[0]);
    return { hourlyAgg: buckets, peakHour: peak, totalRevenue };
  }, [hourly]);

  // Day-of-week × hour heatmap from daily+hourly breakdown
  const dayHeatmap = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const matrix: { day: string; hour: number; value: number }[] = [];
    // Group hourly by weekday
    const byDayHour = new Map<string, number>();
    hourly.forEach((r) => {
      const dow = new Date(r.date + "T12:00:00").getDay();
      const key = `${dow}:${r.hour}`;
      byDayHour.set(key, (byDayHour.get(key) ?? 0) + r.total);
    });
    let maxVal = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const v = byDayHour.get(`${d}:${h}`) ?? 0;
        if (v > maxVal) maxVal = v;
        matrix.push({ day: days[d], hour: h, value: v });
      }
    }
    return { matrix, maxVal, days };
  }, [hourly]);

  if (hourly.length === 0) {
    return <EmptyState message="Selecione o período 'Hoje' ou um dia específico para ver vendas por hora." />;
  }

  const topHours = [...hourlyAgg]
    .filter((b) => b.pedidos > 0)
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border bg-card px-4 py-2.5 text-center min-w-[120px]">
          <p className="text-xs text-muted-foreground">Pico de receita</p>
          <p className="text-lg font-bold text-primary">{peakHour.label}</p>
          <p className="text-xs text-muted-foreground">{currencyFmt(peakHour.receita)}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-2.5 text-center min-w-[120px]">
          <p className="text-xs text-muted-foreground">Total pedidos</p>
          <p className="text-lg font-bold">{hourlyAgg.reduce((s, b) => s + b.pedidos, 0).toLocaleString("pt-BR")}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-2.5 text-center min-w-[120px]">
          <p className="text-xs text-muted-foreground">Receita total</p>
          <p className="text-lg font-bold">{currencyFmt(totalRevenue)}</p>
        </div>
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Receita por hora do dia</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyAgg} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip content={<CurrencyTooltip />} />
              <Bar dataKey="receita" name="Receita" fill={BRAND_COLORS.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pedidos bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pedidos por hora</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyAgg} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} width={32} />
              <Tooltip content={<CurrencyTooltip />} />
              <Bar dataKey="pedidos" name="Pedidos" fill={BRAND_COLORS.blue} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top 5 hours */}
      {topHours.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top horários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topHours.map((h, i) => {
                const pct = totalRevenue > 0 ? (h.receita / totalRevenue) * 100 : 0;
                return (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-5 text-muted-foreground">#{i + 1}</span>
                    <span className="text-sm font-semibold w-10">{h.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pctFmt(pct)}</span>
                    <span className="text-xs font-medium w-24 text-right">{currencyFmt(h.receita)}</span>
                    <span className="text-xs text-muted-foreground">{h.pedidos} ped.</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Ticket Médio ────────────────────────────────────────────────────────

function TabTicket() {
  const { salesCache } = useMLStore();
  const { daily } = salesCache;

  const chartData = useMemo(() => {
    return [...daily]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date.slice(5), // MM-DD
        ticket: d.qty > 0 ? Math.round(d.approved / d.qty) : 0,
        pedidos: d.qty,
        receita: d.approved,
      }))
      .filter((d) => d.pedidos > 0);
  }, [daily]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const tickets = chartData.map((d) => d.ticket);
    const avg = tickets.reduce((s, v) => s + v, 0) / tickets.length;
    const max = Math.max(...tickets);
    const min = Math.min(...tickets);
    const bestDay = chartData.find((d) => d.ticket === max);
    const worstDay = chartData.find((d) => d.ticket === min);
    // Simple linear trend
    const n = chartData.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = tickets.reduce((s, v) => s + v, 0);
    const sumXY = tickets.reduce((s, v, i) => s + i * v, 0);
    const sumX2 = tickets.reduce((s, _, i) => s + i * i, 0);
    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
    return { avg, max, min, bestDay, worstDay, trend: slope };
  }, [chartData]);

  if (daily.length === 0) {
    return <EmptyState message="Nenhum dado de vendas disponível para o período selecionado." />;
  }

  return (
    <div className="space-y-5">
      {stats && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Ticket médio", value: currencyFmt(stats.avg), color: "text-foreground" },
            { label: "Melhor dia", value: currencyFmt(stats.max), sub: stats.bestDay?.date, color: "text-emerald-600" },
            { label: "Pior dia",   value: currencyFmt(stats.min), sub: stats.worstDay?.date, color: "text-red-500" },
            {
              label: "Tendência",
              value: stats.trend > 0 ? `+${currencyFmt(stats.trend)}/dia` : `${currencyFmt(stats.trend)}/dia`,
              color: stats.trend >= 0 ? "text-emerald-600" : "text-red-500",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card px-4 py-2.5 min-w-[130px]">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              {s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução do ticket médio</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="ticketGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BRAND_COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={BRAND_COLORS.primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} width={56} />
              <Tooltip
                formatter={(v: any) => [currencyFmt(v), "Ticket médio"]}
                labelFormatter={(l) => `Data: ${l}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="ticket"
                stroke={BRAND_COLORS.primary}
                strokeWidth={2}
                fill="url(#ticketGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Receita aprovada por dia</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip content={<CurrencyTooltip />} />
              <Bar dataKey="receita" name="Receita" fill={BRAND_COLORS.blue} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Venda por Estado ────────────────────────────────────────────────────

function TabEstado() {
  const { salesCache } = useMLStore();
  const { daily } = salesCache;

  const stateData = useMemo(() => {
    const totalRevenue = daily.reduce((s, d) => s + d.approved, 0);
    const totalOrders = daily.reduce((s, d) => s + d.qty, 0);
    return STATE_DIST.map((s) => {
      const revenue = totalRevenue * (s.pct / 100);
      const orders = Math.round(totalOrders * (s.pct / 100));
      return {
        uf: s.uf,
        name: s.name,
        revenue,
        orders,
        avgTicket: orders > 0 ? revenue / orders : 0,
        pct: s.pct,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [daily]);

  const hasAny = daily.some((d) => d.approved > 0);

  if (!hasAny) {
    return <EmptyState message="Nenhum dado de vendas disponível para o período selecionado." />;
  }

  const top10 = stateData.slice(0, 10);

  return (
    <div className="space-y-5">
      <SimNote text="Distribuição estimada com base em padrões típicos do e-commerce brasileiro. A API de Pedidos (Orders) é necessária para dados reais por estado." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mapa do Brasil</CardTitle>
          </CardHeader>
          <CardContent>
            <BrazilHeatMap data={stateData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 10 estados por receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {top10.map((s, i) => (
                <div key={s.uf} className="flex items-center gap-2">
                  <span className="text-[10px] font-medium w-4 text-muted-foreground text-right">{i + 1}</span>
                  <Badge variant="outline" className="text-[10px] w-8 justify-center font-mono font-semibold">{s.uf}</Badge>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(s.pct / top10[0].pct) * 100}%`, background: BRAND_COLORS.primary }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{pctFmt(s.pct)}</span>
                  <span className="text-xs font-medium w-24 text-right tabular-nums">{currencyFmt(s.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Receita por estado — top 10</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={top10.map((s) => ({ name: s.uf, receita: Math.round(s.revenue), pedidos: s.orders }))}
              margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip content={<CurrencyTooltip />} />
              <Bar dataKey="receita" name="Receita" fill={BRAND_COLORS.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Forma de Pagamento ──────────────────────────────────────────────────

function TabPagamento() {
  const { salesCache } = useMLStore();
  const { daily } = salesCache;

  const payData = useMemo(() => {
    const totalRevenue = daily.reduce((s, d) => s + d.approved, 0);
    const totalOrders = daily.reduce((s, d) => s + d.qty, 0);
    return PAYMENT_DIST.map((p) => ({
      ...p,
      revenue: totalRevenue * (p.pct / 100),
      orders: Math.round(totalOrders * (p.pct / 100)),
    }));
  }, [daily]);

  const hasAny = daily.some((d) => d.approved > 0);

  if (!hasAny) {
    return <EmptyState message="Nenhum dado de vendas disponível para o período selecionado." />;
  }

  const totalRevenue = payData.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="space-y-5">
      <SimNote text="Distribuição estimada com base em padrões típicos do Mercado Livre Brasil. A API de Pagamentos é necessária para dados reais por forma de pagamento." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Participação na receita</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={payData}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  label={({ name, pct }) => `${name} ${pctFmt(pct)}`}
                  labelLine={false}
                >
                  {payData.map((p) => (
                    <Cell key={p.name} fill={p.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any, name: any) => [currencyFmt(v), name]}
                  contentStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detalhamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payData.map((p) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      {p.name}
                    </span>
                    <span className="font-medium">{pctFmt(p.pct)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.color }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{p.orders.toLocaleString("pt-BR")} pedidos</span>
                    <span>{currencyFmt(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Receita por forma de pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={payData.map((p) => ({ name: p.name, receita: Math.round(p.revenue) }))}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip content={<CurrencyTooltip />} />
              <Bar dataKey="receita" name="Receita" radius={[0, 3, 3, 0]}>
                {payData.map((p) => <Cell key={p.name} fill={p.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Funil de Conversão ──────────────────────────────────────────────────

function TabFunil() {
  const { salesCache } = useMLStore();
  const { daily } = salesCache;

  const { funnelData, conversionStats } = useMemo(() => {
    const visits = daily.reduce((s, d) => s + d.unique_visits, 0);
    const buyers = daily.reduce((s, d) => s + d.unique_buyers, 0);
    const orders = daily.reduce((s, d) => s + d.qty, 0);
    const revenue = daily.reduce((s, d) => s + d.approved, 0);

    const funnelData = [
      { name: "Visitas únicas",    value: visits,  fill: BRAND_COLORS.blue },
      { name: "Compradores únicos",value: buyers,  fill: BRAND_COLORS.primary },
      { name: "Pedidos",           value: orders,  fill: BRAND_COLORS.green },
    ].filter((f) => f.value > 0);

    const conversionStats = {
      visitToBuyer: visits > 0 ? (buyers / visits) * 100 : 0,
      buyerToOrder: buyers > 0 ? (orders / buyers) * 100 : 0,
      visitToOrder: visits > 0 ? (orders / visits) * 100 : 0,
      avgTicket:    orders > 0 ? revenue / orders : 0,
      revenue,
    };

    return { funnelData, conversionStats };
  }, [daily]);

  const hasAny = daily.some((d) => d.unique_visits > 0 || d.qty > 0);

  if (!hasAny) {
    return <EmptyState message="Nenhum dado de conversão disponível para o período selecionado." />;
  }

  // Daily conversion rate chart
  const dailyConv = useMemo(() =>
    [...daily]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date.slice(5),
        taxa: d.unique_visits > 0 ? parseFloat(((d.unique_buyers / d.unique_visits) * 100).toFixed(2)) : 0,
        visitas: d.unique_visits,
      }))
      .filter((d) => d.visitas > 0),
    [daily]);

  return (
    <div className="space-y-5">
      {/* KPI chips */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Visita → Comprador", value: pctFmt(conversionStats.visitToBuyer), color: "text-blue-600" },
          { label: "Comprador → Pedido", value: pctFmt(conversionStats.buyerToOrder), color: "text-primary" },
          { label: "Tx. geral (visit→ped)", value: pctFmt(conversionStats.visitToOrder), color: "text-emerald-600" },
          { label: "Ticket médio", value: currencyFmt(conversionStats.avgTicket), color: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card px-4 py-2.5 min-w-[150px]">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Funnel */}
        {funnelData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Funil de conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 py-2">
                {funnelData.map((step, i) => {
                  const pct = i === 0 ? 100 : (step.value / funnelData[0].value) * 100;
                  return (
                    <div key={step.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{step.name}</span>
                        <span className="font-bold">{step.value.toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="h-7 rounded-lg overflow-hidden bg-muted flex items-center">
                        <div
                          className="h-full rounded-lg flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max(pct, 4)}%`, background: step.fill }}
                        >
                          {pct > 15 && <span className="text-[10px] text-white font-medium">{pctFmt(pct)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily conversion rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Taxa de conversão diária</CardTitle>
            <CardDescription className="text-xs">Compradores únicos / Visitas únicas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyConv} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND_COLORS.green} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={BRAND_COLORS.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} width={36} />
                <Tooltip
                  formatter={(v: any) => [`${v}%`, "Taxa de conversão"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="taxa"
                  stroke={BRAND_COLORS.green}
                  strokeWidth={2}
                  fill="url(#convGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function MLRelatorios() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="horario">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="horario"    className="gap-1.5 text-xs"><Clock3   className="w-3.5 h-3.5" />Venda por Hora</TabsTrigger>
          <TabsTrigger value="ticket"     className="gap-1.5 text-xs"><TrendingUp className="w-3.5 h-3.5" />Ticket M&eacute;dio</TabsTrigger>
          <TabsTrigger value="estado"     className="gap-1.5 text-xs"><MapPin   className="w-3.5 h-3.5" />Por Estado</TabsTrigger>
          <TabsTrigger value="pagamento"  className="gap-1.5 text-xs"><CreditCard className="w-3.5 h-3.5" />Pagamento</TabsTrigger>
          <TabsTrigger value="funil"      className="gap-1.5 text-xs"><GitMerge className="w-3.5 h-3.5" />Funil</TabsTrigger>
        </TabsList>

        <TabsContent value="horario"   className="mt-4"><TabHorario  /></TabsContent>
        <TabsContent value="ticket"    className="mt-4"><TabTicket   /></TabsContent>
        <TabsContent value="estado"    className="mt-4"><TabEstado   /></TabsContent>
        <TabsContent value="pagamento" className="mt-4"><TabPagamento /></TabsContent>
        <TabsContent value="funil"     className="mt-4"><TabFunil    /></TabsContent>
      </Tabs>
    </div>
  );
}
