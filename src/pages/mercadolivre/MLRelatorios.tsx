import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock3, MapPin, CreditCard, TrendingUp, GitMerge, Info, ShoppingCart, DollarSign, Eye, Users, Percent, Tag } from "lucide-react";
import { BrazilHeatMap } from "@/components/mercadolivre/BrazilHeatMap";
import { useMLStore } from "@/contexts/MLStoreContext";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";

// ─── Helpers ────────────────────────────────────────────────────────────────

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const pctFmt = (v: number) => `${v.toFixed(1)}%`;

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  backgroundColor: "hsl(var(--card))",
  color: "hsl(var(--card-foreground))",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  fontSize: 12,
};

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

// ─── Tab: Venda por Hora ──────────────────────────────────────────────────────

function TabHorario() {
  const { salesCache } = useMLStore();
  const { hourly } = salesCache;

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

  if (hourly.length === 0) {
    return <EmptyState message="Selecione o período 'Hoje' ou um dia específico para ver vendas por hora." />;
  }

  const totalPedidos = hourlyAgg.reduce((s, b) => s + b.pedidos, 0);

  const topHours = [...hourlyAgg]
    .filter((b) => b.pedidos > 0)
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* KPI chips */}
      <div className="grid grid-cols-3 gap-3">
        <KPICard
          title="Pico de receita"
          value={peakHour.label}
          subtitle={currencyFmt(peakHour.receita)}
          icon={<Clock3 className="w-4 h-4" />}
          variant="minimal"
          iconClassName="bg-accent/10 text-accent"
          size="compact"
        />
        <KPICard
          title="Total pedidos"
          value={totalPedidos.toLocaleString("pt-BR")}
          icon={<ShoppingCart className="w-4 h-4" />}
          variant="minimal"
          iconClassName="bg-[hsl(270,70%,50%)]/10 text-[hsl(270,70%,50%)]"
          size="compact"
        />
        <KPICard
          title="Receita total"
          value={currencyFmt(totalRevenue)}
          icon={<DollarSign className="w-4 h-4" />}
          variant="minimal"
          iconClassName="bg-success/10 text-success"
          size="compact"
        />
      </div>

      {/* Bar chart — Receita */}
      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Receita por hora do dia</span>
        </div>
        <CardContent className="px-4 pb-2 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyAgg} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" interval={2} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip
                formatter={(value: number) => [currencyFmt(value), "Receita"]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="receita" name="Receita" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar chart — Pedidos */}
      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Pedidos por hora</span>
        </div>
        <CardContent className="px-4 pb-2 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyAgg} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" interval={2} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" width={32} />
              <Tooltip
                formatter={(value: number) => [value, "Pedidos"]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="pedidos" name="Pedidos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top 5 hours */}
      {topHours.length > 0 && (
        <Card>
          <div className="px-4 pt-4 pb-3">
            <span className="text-sm font-medium text-foreground">Top horários</span>
          </div>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-2">
              {topHours.map((h, i) => {
                const pct = totalRevenue > 0 ? (h.receita / totalRevenue) * 100 : 0;
                return (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-5 text-muted-foreground">#{i + 1}</span>
                    <span className="text-sm font-semibold w-10">{h.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-10 text-right">{pctFmt(pct)}</span>
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
        date: d.date.slice(5),
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
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            title="Ticket médio"
            value={currencyFmt(stats.avg)}
            icon={<Tag className="w-4 h-4" />}
            variant="minimal"
            iconClassName="bg-accent/10 text-accent"
            size="compact"
          />
          <KPICard
            title="Melhor dia"
            value={currencyFmt(stats.max)}
            subtitle={stats.bestDay?.date}
            icon={<TrendingUp className="w-4 h-4" />}
            variant="minimal"
            iconClassName="bg-success/10 text-success"
            size="compact"
          />
          <KPICard
            title="Pior dia"
            value={currencyFmt(stats.min)}
            subtitle={stats.worstDay?.date}
            icon={<TrendingUp className="w-4 h-4" />}
            variant="minimal"
            iconClassName="bg-destructive/10 text-destructive"
            size="compact"
          />
          <KPICard
            title="Tendência"
            value={stats.trend > 0 ? `+${currencyFmt(stats.trend)}/dia` : `${currencyFmt(stats.trend)}/dia`}
            icon={<TrendingUp className="w-4 h-4" />}
            variant="minimal"
            iconClassName={stats.trend >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
            size="compact"
          />
        </div>
      )}

      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Evolução do ticket médio</span>
        </div>
        <CardContent className="px-4 pb-2 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="ticketGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} width={56} />
              <Tooltip
                formatter={(v: any) => [currencyFmt(v), "Ticket médio"]}
                labelFormatter={(l) => `Data: ${l}`}
                contentStyle={tooltipStyle}
              />
              <Area
                type="monotone"
                dataKey="ticket"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                fill="url(#ticketGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Receita aprovada por dia</span>
        </div>
        <CardContent className="px-4 pb-2 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip
                formatter={(value: number) => [currencyFmt(value), "Receita"]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={24} />
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
    <div className="space-y-4">
      <SimNote text="Distribuição estimada com base em padrões típicos do e-commerce brasileiro. A API de Pedidos (Orders) é necessária para dados reais por estado." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <div className="px-4 pt-4 pb-3">
            <span className="text-sm font-medium text-foreground">Mapa do Brasil</span>
          </div>
          <CardContent className="px-4 pb-4 pt-0">
            <BrazilHeatMap data={stateData} />
          </CardContent>
        </Card>

        <Card>
          <div className="px-4 pt-4 pb-3">
            <span className="text-sm font-medium text-foreground">Top 10 estados por receita</span>
          </div>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-2">
              {top10.map((s, i) => (
                <div key={s.uf} className="flex items-center gap-2">
                  <span className="text-[10px] font-medium w-4 text-muted-foreground text-right">{i + 1}</span>
                  <Badge variant="outline" className="text-[10px] w-8 justify-center font-mono font-semibold">{s.uf}</Badge>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(s.pct / top10[0].pct) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{pctFmt(s.pct)}</span>
                  <span className="text-xs font-medium w-24 text-right">{currencyFmt(s.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Receita por estado — top 10</span>
        </div>
        <CardContent className="px-4 pb-2 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={top10.map((s) => ({ name: s.uf, receita: Math.round(s.revenue), pedidos: s.orders }))}
              margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip
                formatter={(value: number, name: string) => [currencyFmt(value), "Receita"]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="receita" name="Receita" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} maxBarSize={24} />
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

  return (
    <div className="space-y-4">
      <SimNote text="Distribuição estimada com base em padrões típicos do Mercado Livre Brasil. A API de Pagamentos é necessária para dados reais por forma de pagamento." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <div className="px-4 pt-4 pb-3">
            <span className="text-sm font-medium text-foreground">Participação na receita</span>
          </div>
          <CardContent className="px-4 pb-2 pt-0 flex flex-col items-center">
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
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <div className="px-4 pt-4 pb-3">
            <span className="text-sm font-medium text-foreground">Detalhamento</span>
          </div>
          <CardContent className="px-4 pb-4 pt-0">
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
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Receita por forma de pagamento</span>
        </div>
        <CardContent className="px-4 pb-2 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={payData.map((p) => ({ name: p.name, receita: Math.round(p.revenue) }))}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" width={110} />
              <Tooltip
                formatter={(value: number) => [currencyFmt(value), "Receita"]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="receita" name="Receita" radius={[0, 6, 6, 0]} maxBarSize={24}>
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
      { name: "Visitas únicas",    value: visits,  fill: "hsl(var(--primary))" },
      { name: "Compradores únicos",value: buyers,  fill: "hsl(var(--accent))" },
      { name: "Pedidos",           value: orders,  fill: "hsl(var(--success))" },
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

  const hasAny = daily.some((d) => d.unique_visits > 0 || d.qty > 0);

  if (!hasAny) {
    return <EmptyState message="Nenhum dado de conversão disponível para o período selecionado." />;
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Visita → Comprador"
          value={pctFmt(conversionStats.visitToBuyer)}
          icon={<Eye className="w-4 h-4" />}
          variant="minimal"
          iconClassName="bg-primary/10 text-primary"
          size="compact"
        />
        <KPICard
          title="Comprador → Pedido"
          value={pctFmt(conversionStats.buyerToOrder)}
          icon={<Users className="w-4 h-4" />}
          variant="minimal"
          iconClassName="bg-accent/10 text-accent"
          size="compact"
        />
        <KPICard
          title="Tx. geral"
          value={pctFmt(conversionStats.visitToOrder)}
          icon={<Percent className="w-4 h-4" />}
          variant="minimal"
          iconClassName="bg-success/10 text-success"
          size="compact"
        />
        <KPICard
          title="Ticket médio"
          value={currencyFmt(conversionStats.avgTicket)}
          icon={<Tag className="w-4 h-4" />}
          variant="minimal"
          iconClassName="bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"
          size="compact"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Funnel */}
        {funnelData.length > 0 && (
          <Card>
            <div className="px-4 pt-4 pb-3">
              <span className="text-sm font-medium text-foreground">Funil de conversão</span>
            </div>
            <CardContent className="px-4 pb-4 pt-0">
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
          <div className="px-4 pt-4 pb-3">
            <span className="text-sm font-medium text-foreground">Taxa de conversão diária</span>
            <p className="text-xs text-muted-foreground mt-0.5">Compradores únicos / Visitas únicas</p>
          </div>
          <CardContent className="px-4 pb-2 pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyConv} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}%`} width={36} />
                <Tooltip
                  formatter={(v: any) => [`${v}%`, "Taxa de conversão"]}
                  contentStyle={tooltipStyle}
                />
                <Area
                  type="monotone"
                  dataKey="taxa"
                  stroke="hsl(var(--success))"
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
    <div className="space-y-4 -mt-8">
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