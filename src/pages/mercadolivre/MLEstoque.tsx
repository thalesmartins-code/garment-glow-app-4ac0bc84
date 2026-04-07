import { useMemo, useState } from "react";
import { useMLInventory } from "@/contexts/MLInventoryContext";
import { useMLCoverage, COVERAGE_PERIODS, COVERAGE_CLASS_LABELS } from "@/hooks/useMLCoverage";
import type { CoveragePeriod, CoverageClass, CoverageData } from "@/hooks/useMLCoverage";
import type { ProductItem } from "@/contexts/MLInventoryContext";
import { CoverageAlerts } from "@/components/mercadolivre/CoverageAlerts";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Package, PackageX, AlertTriangle, Boxes, RefreshCw, Search, ExternalLink, Plug,
  ChevronDown, ChevronRight, Clock, DollarSign, TrendingUp, Activity, Truck, BarChart3,
  ShieldAlert, Eye, Tag,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area,
} from "recharts";
import { Link } from "react-router-dom";

// ─── Helpers ────────────────────────────────────────────────────────────────

const currencyFmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const numFmt = (v: number) =>
  new Intl.NumberFormat("pt-BR").format(v);

const COVERAGE_COLORS: Record<CoverageClass, string> = {
  ruptura: "#ef4444",
  critico: "#f97316",
  alerta: "#f59e0b",
  ok: "#22c55e",
  sem_giro: "#94a3b8",
};

function CoverageBadge({ cls }: { cls: CoverageClass }) {
  const color = COVERAGE_COLORS[cls];
  const label = COVERAGE_CLASS_LABELS[cls] ?? cls;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

function HealthBar({ health }: { health: number | null }) {
  if (health === null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.round(health * 100);
  const color = health < 0.5 ? "bg-red-500" : health < 0.8 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── EstoqueRelatorios ───────────────────────────────────────────────────────

interface RelatoriosProps {
  items: ProductItem[];
  coverageMap: Map<string, CoverageData>;
  coveragePeriod: CoveragePeriod;
}

function SubTabCobertura({ items, coverageMap }: Pick<RelatoriosProps, "items" | "coverageMap">) {
  const pieData = useMemo(() => {
    const counts: Record<CoverageClass, number> = { ruptura: 0, critico: 0, alerta: 0, ok: 0, sem_giro: 0 };
    items.forEach((item) => {
      const cd = coverageMap.get(item.id);
      if (cd) counts[cd.coverage_class]++;
    });
    return (Object.keys(counts) as CoverageClass[]).map((cls) => ({
      name: COVERAGE_CLASS_LABELS[cls] ?? cls,
      value: counts[cls],
      color: COVERAGE_COLORS[cls],
      cls,
    })).filter((d) => d.value > 0);
  }, [items, coverageMap]);

  const riskItems = useMemo(() => {
    const order: CoverageClass[] = ["ruptura", "critico", "alerta"];
    return items
      .map((item) => ({ item, cd: coverageMap.get(item.id) }))
      .filter(({ cd }) => cd && order.includes(cd.coverage_class))
      .sort((a, b) => {
        const oa = order.indexOf(a.cd!.coverage_class);
        const ob = order.indexOf(b.cd!.coverage_class);
        if (oa !== ob) return oa - ob;
        return (a.cd!.coverage_days ?? 0) - (b.cd!.coverage_days ?? 0);
      })
      .slice(0, 10)
      .map(({ item, cd }) => ({
        name: item.title.slice(0, 30),
        days: cd!.coverage_days ?? 0,
        cls: cd!.coverage_class,
        color: COVERAGE_COLORS[cd!.coverage_class],
      }));
  }, [items, coverageMap]);

  const need7 = useMemo(() =>
    items.filter((item) => {
      const cd = coverageMap.get(item.id);
      return cd && (cd.coverage_days === null || cd.coverage_days <= 7);
    }).length,
    [items, coverageMap]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Cobertura</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs">
                <Package className="w-8 h-8 mb-2 opacity-40" />
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 10 em Risco</CardTitle>
          </CardHeader>
          <CardContent>
            {riskItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs">
                <ShieldAlert className="w-8 h-8 mb-2 opacity-40" />
                Nenhum item em risco
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={riskItems} layout="vertical" margin={{ left: 4, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v} dias`, "Cobertura"]} />
                  <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                    {riskItems.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      {need7 > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>{need7} produtos</strong> precisam de reposição nos próximos 7 dias.</span>
        </div>
      )}
    </div>
  );
}

function SubTabValorRisco({ items, coverageMap }: Pick<RelatoriosProps, "items" | "coverageMap">) {
  const { byClass, top10, capitalCards } = useMemo(() => {
    const classMap: Record<CoverageClass, number> = { ruptura: 0, critico: 0, alerta: 0, ok: 0, sem_giro: 0 };
    const withValor = items.map((item) => {
      const valor = item.price * item.available_quantity;
      const cd = coverageMap.get(item.id);
      const cls: CoverageClass = cd?.coverage_class ?? "sem_giro";
      classMap[cls] += valor;
      return { item, valor, cls };
    });
    const byClass = (Object.keys(classMap) as CoverageClass[]).map((cls) => ({
      name: COVERAGE_CLASS_LABELS[cls] ?? cls,
      valor: classMap[cls],
      color: COVERAGE_COLORS[cls],
    }));
    const top10 = [...withValor].sort((a, b) => b.valor - a.valor).slice(0, 10);
    const capitalCards = {
      risco: classMap.ruptura + classMap.critico,
      parado: classMap.sem_giro,
      saudavel: classMap.ok,
    };
    return { byClass, top10, capitalCards };
  }, [items, coverageMap]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Capital em Ruptura/Crítico</p>
            <p className="text-lg font-bold text-red-500">{currencyFmt(capitalCards.risco)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Capital Parado (Sem Giro)</p>
            <p className="text-lg font-bold text-slate-500">{currencyFmt(capitalCards.parado)}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Capital Saudável</p>
            <p className="text-lg font-bold text-green-500">{currencyFmt(capitalCards.saudavel)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Capital por Classe de Cobertura</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byClass} margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [currencyFmt(v), "Valor"]} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {byClass.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top 10 por Valor em Estoque</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Produto</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
                <TableHead className="text-xs">Cobertura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top10.map(({ item, valor, cls }) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs max-w-[240px] truncate">{item.title}</TableCell>
                  <TableCell className="text-xs text-right font-medium">{currencyFmt(valor)}</TableCell>
                  <TableCell><CoverageBadge cls={cls} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SubTabCurvaABC({ items }: Pick<RelatoriosProps, "items">) {
  const { paretoData, summary, topA, counts } = useMemo(() => {
    const sorted = [...items]
      .map((item) => ({ item, revenue: item.sold_quantity * item.price }))
      .sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = sorted.reduce((s, d) => s + d.revenue, 0);
    let cumulative = 0;
    const classified = sorted.map(({ item, revenue }) => {
      cumulative += revenue;
      const cumPct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
      const abc: "A" | "B" | "C" = cumPct <= 80 ? "A" : cumPct <= 95 ? "B" : "C";
      return { item, revenue, cumPct, abc };
    });
    const paretoData = classified.slice(0, 20).map((d, i) => ({
      name: `#${i + 1}`,
      receita: d.revenue,
      cumulativo: parseFloat(d.cumPct.toFixed(1)),
      abc: d.abc,
    }));
    const topA = classified.filter((d) => d.abc === "A").slice(0, 5);
    const counts = {
      A: classified.filter((d) => d.abc === "A").length,
      B: classified.filter((d) => d.abc === "B").length,
      C: classified.filter((d) => d.abc === "C").length,
    };
    const aPct = items.length > 0 ? Math.round((counts.A / items.length) * 100) : 0;
    const summary = `${aPct}% dos SKUs (Classe A) respondem por ~80% da receita`;
    return { paretoData, summary, topA, counts };
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm text-muted-foreground bg-muted/40">
        <TrendingUp className="w-4 h-4 shrink-0" />
        <span>{summary}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(["A", "B", "C"] as const).map((cls) => (
          <Card key={cls}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{counts[cls]}</p>
              <p className="text-xs text-muted-foreground">Classe {cls}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Curva de Pareto (Top 20 SKUs)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={paretoData} margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar yAxisId="left" dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Receita" />
              <Line yAxisId="right" type="monotone" dataKey="cumulativo" stroke="#f97316" dot={false} strokeWidth={2} name="Acumulado %" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      {topA.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Itens Classe A</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Produto</TableHead>
                  <TableHead className="text-xs text-right">Receita</TableHead>
                  <TableHead className="text-xs text-right">Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topA.map(({ item, revenue, cumPct }) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs max-w-[240px] truncate">{item.title}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{currencyFmt(revenue)}</TableCell>
                    <TableCell className="text-xs text-right">{cumPct.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SubTabSaude({ items }: Pick<RelatoriosProps, "items">) {
  const { buckets, byVisits, unhealthy } = useMemo(() => {
    const withHealth = items.filter((i) => i.health !== null) as (ProductItem & { health: number })[];
    const buckets = [
      { name: "Ótimo (≥80%)", count: withHealth.filter((i) => i.health >= 0.8).length, color: "#22c55e" },
      { name: "Bom (60-80%)", count: withHealth.filter((i) => i.health >= 0.6 && i.health < 0.8).length, color: "#84cc16" },
      { name: "Regular (40-60%)", count: withHealth.filter((i) => i.health >= 0.4 && i.health < 0.6).length, color: "#f59e0b" },
      { name: "Ruim (<40%)", count: withHealth.filter((i) => i.health < 0.4).length, color: "#ef4444" },
    ];
    const byVisits = [...withHealth].sort((a, b) => b.visits - a.visits).slice(0, 10);
    const unhealthy = withHealth.filter((i) => i.health < 0.6).sort((a, b) => b.visits - a.visits).slice(0, 10);
    return { buckets, byVisits, unhealthy };
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição de Saúde</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={buckets.filter((b) => b.count > 0)} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {buckets.filter((b) => b.count > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top por Visitas (com saúde)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Produto</TableHead>
                  <TableHead className="text-xs text-right">Visitas</TableHead>
                  <TableHead className="text-xs">Saúde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byVisits.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs max-w-[160px] truncate">{item.title}</TableCell>
                    <TableCell className="text-xs text-right">{numFmt(item.visits)}</TableCell>
                    <TableCell><HealthBar health={item.health} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {unhealthy.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Anúncios com Saúde Baixa (&lt;60%) — por Visitas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Produto</TableHead>
                  <TableHead className="text-xs text-right">Visitas</TableHead>
                  <TableHead className="text-xs">Saúde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unhealthy.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs max-w-[240px] truncate">{item.title}</TableCell>
                    <TableCell className="text-xs text-right">{numFmt(item.visits)}</TableCell>
                    <TableCell><HealthBar health={item.health} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SubTabLogistica({ items }: Pick<RelatoriosProps, "items">) {
  const { logisticData, shippingData, listingData, fulfillmentComparison } = useMemo(() => {
    const logisticCounts: Record<string, number> = {};
    let freeCount = 0;
    const listingCounts: Record<string, number> = {};
    let fulfillmentSold = 0, fulfillmentCount = 0, otherSold = 0, otherCount = 0;

    items.forEach((item) => {
      const lt = item.logistic_type ?? "not_specified";
      logisticCounts[lt] = (logisticCounts[lt] ?? 0) + 1;
      if (item.free_shipping) freeCount++;
      const lt2 = item.listing_type_id ?? "unknown";
      listingCounts[lt2] = (listingCounts[lt2] ?? 0) + 1;
      if (lt === "fulfillment") { fulfillmentSold += item.sold_quantity; fulfillmentCount++; }
      else { otherSold += item.sold_quantity; otherCount++; }
    });

    const LOGISTIC_LABELS: Record<string, string> = {
      fulfillment: "Full (Fulfillment)",
      default: "Padrão",
      drop_off: "Drop-off",
      xd_drop_off: "XD Drop-off",
      not_specified: "Não especificado",
    };
    const logisticColors = ["#6366f1", "#22c55e", "#f59e0b", "#f97316", "#94a3b8"];
    const logisticData = Object.entries(logisticCounts).map(([k, v], i) => ({
      name: LOGISTIC_LABELS[k] ?? k,
      value: v,
      color: logisticColors[i % logisticColors.length],
    }));
    const shippingData = [
      { name: "Com Frete Grátis", value: freeCount, color: "#22c55e" },
      { name: "Sem Frete Grátis", value: items.length - freeCount, color: "#94a3b8" },
    ].filter((d) => d.value > 0);
    const listingData = Object.entries(listingCounts).map(([k, v]) => ({ name: k, count: v })).sort((a, b) => b.count - a.count);
    const fulfillmentComparison = [
      { name: "Full (Fulfillment)", avg: fulfillmentCount > 0 ? fulfillmentSold / fulfillmentCount : 0 },
      { name: "Outros", avg: otherCount > 0 ? otherSold / otherCount : 0 },
    ];
    return { logisticData, shippingData, listingData, fulfillmentComparison };
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tipo de Logística</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={logisticData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {logisticData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Frete Grátis</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={shippingData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {shippingData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tipo de Anúncio</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={listingData} margin={{ left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Qtd" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Média de Vendas: Full vs Outros</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fulfillmentComparison} margin={{ left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [v.toFixed(1), "Média Vendidos"]} />
                <Bar dataKey="avg" fill="#6366f1" radius={[4, 4, 0, 0]} name="Média Vendidos" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">
              Produtos com logística Full (Fulfillment) tendem a ter maior visibilidade no ML.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EstoqueRelatorios({ items, coverageMap, coveragePeriod }: RelatoriosProps) {
  return (
    <Tabs defaultValue="cobertura">
      <TabsList className="mb-4 flex flex-wrap gap-1 h-auto">
        <TabsTrigger value="cobertura" className="text-xs gap-1.5"><Clock className="w-3.5 h-3.5" />Cobertura</TabsTrigger>
        <TabsTrigger value="valor" className="text-xs gap-1.5"><DollarSign className="w-3.5 h-3.5" />Valor em Risco</TabsTrigger>
        <TabsTrigger value="abc" className="text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Curva ABC</TabsTrigger>
        <TabsTrigger value="saude" className="text-xs gap-1.5"><Activity className="w-3.5 h-3.5" />Saúde</TabsTrigger>
        <TabsTrigger value="logistica" className="text-xs gap-1.5"><Truck className="w-3.5 h-3.5" />Logística</TabsTrigger>
      </TabsList>
      <TabsContent value="cobertura"><SubTabCobertura items={items} coverageMap={coverageMap} /></TabsContent>
      <TabsContent value="valor"><SubTabValorRisco items={items} coverageMap={coverageMap} /></TabsContent>
      <TabsContent value="abc"><SubTabCurvaABC items={items} /></TabsContent>
      <TabsContent value="saude"><SubTabSaude items={items} /></TabsContent>
      <TabsContent value="logistica"><SubTabLogistica items={items} /></TabsContent>
    </Tabs>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MLEstoque() {
  const { items, loading: isLoading, hasToken, lastUpdated, refresh } = useMLInventory();
  // hasToken: null = ainda carregando, false = sem token, true = conectado
  const isConnected = hasToken !== false;
  const [coveragePeriod, setCoveragePeriod] = useState<CoveragePeriod>("weekly");
  const { coverageMap, stats } = useMLCoverage(items, coveragePeriod);

  // Filter / sort state
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [coverageFilter, setCoverageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("title");
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const totalStockValue = useMemo(
    () => items.reduce((s, i) => s + i.price * i.available_quantity, 0),
    [items]
  );

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (hideOutOfStock) result = result.filter((i) => i.available_quantity > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) => i.title.toLowerCase().includes(q) || i.id.includes(q) || (i.seller_custom_field ?? "").toLowerCase().includes(q)
      );
    }
    if (stockFilter === "in_stock") result = result.filter((i) => i.available_quantity > 0);
    if (stockFilter === "out_of_stock") result = result.filter((i) => i.available_quantity === 0);
    if (coverageFilter !== "all") {
      result = result.filter((i) => {
        const cd = coverageMap.get(i.id);
        return cd?.coverage_class === coverageFilter;
      });
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "price_desc": return b.price - a.price;
        case "price_asc": return a.price - b.price;
        case "qty_desc": return b.available_quantity - a.available_quantity;
        case "qty_asc": return a.available_quantity - b.available_quantity;
        case "sold_desc": return b.sold_quantity - a.sold_quantity;
        case "visits_desc": return b.visits - a.visits;
        case "health_asc": return (a.health ?? 1) - (b.health ?? 1);
        default: return a.title.localeCompare(b.title);
      }
    });
    return result;
  }, [items, search, stockFilter, coverageFilter, sortBy, hideOutOfStock, coverageMap]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Plug className="w-12 h-12 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground text-sm max-w-xs">
          Conecte sua conta do Mercado Livre para visualizar o estoque.
        </p>
        <Button asChild variant="default" size="sm">
          <Link to="/integrations">Ir para Integrações</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <MLPageHeader title="Estoque" lastUpdated={lastUpdated}>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </MLPageHeader>

      {/* Coverage period selector */}
      <div className="flex gap-1.5">
        {(Object.entries(COVERAGE_PERIODS) as [CoveragePeriod, { label: string }][]).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setCoveragePeriod(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              coveragePeriod === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Total SKUs" value={numFmt(items.length)} icon={<Boxes className="w-4 h-4" />} />
        <KPICard title="Valor em Estoque" value={currencyFmt(totalStockValue)} icon={<DollarSign className="w-4 h-4" />} />
        <KPICard
          title="Cobertura Média"
          value={stats.avg_coverage != null ? `${stats.avg_coverage} dias` : "—"}
          icon={<Clock className="w-4 h-4" />}
        />
        <KPICard
          title="Em Ruptura"
          value={numFmt(stats.ruptura)}
          icon={<PackageX className="w-4 h-4" />}
          variant={stats.ruptura > 0 ? "danger" : undefined}
        />
        <KPICard
          title="Crítico + Alerta"
          value={numFmt(stats.critico + stats.alerta)}
          icon={<AlertTriangle className="w-4 h-4" />}
          variant={stats.critico + stats.alerta > 0 ? "warning" : undefined}
        />
        <KPICard title="Sem Giro" value={numFmt(stats.sem_giro)} icon={<Activity className="w-4 h-4" />} />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="estoque">
        <TabsList>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="estoque" className="space-y-4 mt-4">
          <CoverageAlerts coverageMap={coverageMap} items={items} />

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="in_stock">Em Estoque</SelectItem>
                <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
              </SelectContent>
            </Select>
            <Select value={coverageFilter} onValueChange={setCoverageFilter}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas coberturas</SelectItem>
                {(Object.keys(COVERAGE_CLASS_LABELS) as CoverageClass[]).map((cls) => (
                  <SelectItem key={cls} value={cls}>{COVERAGE_CLASS_LABELS[cls]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Nome A-Z</SelectItem>
                <SelectItem value="price_desc">Maior Preço</SelectItem>
                <SelectItem value="price_asc">Menor Preço</SelectItem>
                <SelectItem value="qty_desc">Maior Estoque</SelectItem>
                <SelectItem value="qty_asc">Menor Estoque</SelectItem>
                <SelectItem value="sold_desc">Mais Vendidos</SelectItem>
                <SelectItem value="visits_desc">Maior Visitas</SelectItem>
                <SelectItem value="health_asc">Menor Saúde</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox checked={hideOutOfStock} onCheckedChange={(v) => setHideOutOfStock(!!v)} />
              Ocultar sem estoque
            </label>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead className="w-10" />
                    <TableHead className="text-xs">Produto</TableHead>
                    <TableHead className="text-xs text-right">Preço</TableHead>
                    <TableHead className="text-xs text-right">Disp.</TableHead>
                    <TableHead className="text-xs text-right">Visitas</TableHead>
                    <TableHead className="text-xs text-right">Vendidos</TableHead>
                    <TableHead className="text-xs">Cobertura</TableHead>
                    <TableHead className="text-xs">Saúde</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                          <Package className="w-8 h-8 opacity-40" />
                          <span className="text-sm">Nenhum produto encontrado</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredItems.map((item) => {
                    const cd = coverageMap.get(item.id);
                    const isOpen = expanded.has(item.id);
                    return (
                      <>
                        <TableRow key={item.id} className="group">
                          <TableCell className="p-1 pl-2">
                            {item.has_variations && item.variations.length > 0 && (
                              <button onClick={() => toggleExpand(item.id)} className="text-muted-foreground hover:text-foreground">
                                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="p-1">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px]">
                            <div className="font-medium truncate">{item.title}</div>
                            <div className="text-muted-foreground text-[10px] flex gap-1 flex-wrap mt-0.5">
                              <span>{item.id}</span>
                              {item.seller_custom_field && <Badge variant="outline" className="text-[10px] h-4 px-1">{item.seller_custom_field}</Badge>}
                              {item.free_shipping && <Badge className="text-[10px] h-4 px-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0">Frete grátis</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">{currencyFmt(item.price)}</TableCell>
                          <TableCell className={`text-xs text-right font-semibold ${item.available_quantity === 0 ? "text-red-500" : ""}`}>
                            {numFmt(item.available_quantity)}
                          </TableCell>
                          <TableCell className="text-xs text-right">{numFmt(item.visits)}</TableCell>
                          <TableCell className="text-xs text-right">{numFmt(item.sold_quantity)}</TableCell>
                          <TableCell>{cd ? <CoverageBadge cls={cd.coverage_class} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                          <TableCell><HealthBar health={item.health} /></TableCell>
                          <TableCell className="p-1">
                            <a
                              href={`https://produto.mercadolivre.com.br/${item.id.replace(/^(MLB)(\d+)$/, "$1-$2")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </TableCell>
                        </TableRow>
                        {isOpen && item.variations.map((v) => (
                          <TableRow key={v.variation_id} className="bg-muted/30">
                            <TableCell />
                            <TableCell />
                            <TableCell className="text-xs pl-6 text-muted-foreground" colSpan={2}>
                              {v.attribute_combinations?.map((a) => `${a.name}: ${a.value}`).join(" / ") || `Variação ${v.variation_id}`}
                            </TableCell>
                            <TableCell className="text-xs text-right font-medium">{numFmt(v.available_quantity)}</TableCell>
                            <TableCell className="text-xs text-right text-muted-foreground">{numFmt(v.sold_quantity)}</TableCell>
                            <TableCell colSpan={4} />
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              {filteredItems.length} de {items.length} produtos
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios" className="mt-4">
          <EstoqueRelatorios items={items} coverageMap={coverageMap} coveragePeriod={coveragePeriod} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
