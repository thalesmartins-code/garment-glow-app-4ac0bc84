import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, FileText, TrendingDown, DollarSign, ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area,
} from "recharts";
import { getMarketplaceDailyData, getMarketplaceProducts } from "@/data/marketplaceMockData";
import { useMemo } from "react";

const MARKETPLACES = [
  { key: "mercado-livre", name: "Mercado Livre", color: "#e6b422" },
  { key: "amazon", name: "Amazon", color: "#FF9900" },
  { key: "shopee", name: "Shopee", color: "#EE4D2D" },
  { key: "magalu", name: "Magalu", color: "#0086FF" },
];

const PIE_COLORS = ["#e6b422", "#FF9900", "#EE4D2D", "#0086FF"];

function useReportData() {
  return useMemo(() => {
    // Comparativo
    const comparativo = MARKETPLACES.map((mp) => {
      const daily = getMarketplaceDailyData(mp.key, 30);
      const totalRevenue = daily.reduce((s, d) => s + d.total, 0);
      const totalOrders = daily.reduce((s, d) => s + d.qty, 0);
      const totalApproved = daily.reduce((s, d) => s + d.approved, 0);
      const totalCancelled = daily.reduce((s, d) => s + d.cancelled, 0);
      const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const approvalRate = totalRevenue > 0 ? (totalApproved / totalRevenue) * 100 : 0;
      return {
        name: mp.name,
        key: mp.key,
        color: mp.color,
        revenue: totalRevenue,
        orders: totalOrders,
        avgTicket,
        approvalRate,
        cancelled: totalCancelled,
      };
    });

    // Curva ABC - all products across marketplaces
    const allProducts = MARKETPLACES.flatMap((mp) =>
      getMarketplaceProducts(mp.key).map((p) => ({ ...p, marketplace: mp.name, mpColor: mp.color }))
    );
    allProducts.sort((a, b) => b.revenue - a.revenue);
    const totalProductRevenue = allProducts.reduce((s, p) => s + p.revenue, 0);
    let cumulative = 0;
    const abcProducts = allProducts.map((p) => {
      cumulative += p.revenue;
      const pct = (cumulative / totalProductRevenue) * 100;
      const classification = pct <= 80 ? "A" : pct <= 95 ? "B" : "C";
      return { ...p, cumulativePct: pct, classification };
    });

    // Pareto chart data (top 20)
    const paretoData = abcProducts.slice(0, 20).map((p, i) => ({
      name: p.title.length > 25 ? p.title.slice(0, 22) + "…" : p.title,
      revenue: Math.round(p.revenue),
      cumPct: Math.round(p.cumulativePct * 10) / 10,
    }));

    // Taxa de cancelamento
    const cancelData = comparativo.map((mp) => ({
      name: mp.name,
      color: mp.color,
      orders: mp.orders,
      cancelled: mp.cancelled,
      rate: mp.orders > 0 ? (mp.cancelled / mp.orders) * 100 : 0,
    }));

    // Margem simulada
    const commissions: Record<string, number> = {
      "mercado-livre": 0.16,
      amazon: 0.15,
      shopee: 0.20,
      magalu: 0.18,
    };
    const marginData = comparativo.map((mp) => {
      const commission = commissions[mp.key] || 0.15;
      const grossRevenue = mp.revenue;
      const commissionValue = grossRevenue * commission;
      const freight = mp.orders * 12; // avg freight
      const netRevenue = grossRevenue - commissionValue - freight;
      const marginPct = grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0;
      return {
        name: mp.name,
        color: mp.color,
        grossRevenue: Math.round(grossRevenue),
        commission: Math.round(commissionValue),
        commissionPct: Math.round(commission * 100),
        freight: Math.round(freight),
        netRevenue: Math.round(netRevenue),
        marginPct: Math.round(marginPct * 10) / 10,
      };
    });

    return { comparativo, abcProducts, paretoData, cancelData, marginData };
  }, []);
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtNum = (v: number) => v.toLocaleString("pt-BR");

export default function MLRelatorios() {
  const { comparativo, abcProducts, paretoData, cancelData, marginData } = useReportData();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Análises essenciais para vendedores multi-marketplace</p>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="comparativo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-3xl">
          <TabsTrigger value="comparativo" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Comparativo</span>
          </TabsTrigger>
          <TabsTrigger value="abc" className="gap-1.5 text-xs sm:text-sm">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Curva ABC</span>
          </TabsTrigger>
          <TabsTrigger value="cancelamento" className="gap-1.5 text-xs sm:text-sm">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cancelamento</span>
          </TabsTrigger>
          <TabsTrigger value="margem" className="gap-1.5 text-xs sm:text-sm">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Margem</span>
          </TabsTrigger>
        </TabsList>

        {/* === COMPARATIVO === */}
        <TabsContent value="comparativo">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparativo entre Marketplaces</CardTitle>
                <CardDescription>Receita, pedidos e ticket médio — últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparativo} barGap={8}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}`} />
                      <Tooltip
                        formatter={(value: number, name: string) =>
                          name === "Receita" ? fmt(value) : fmtNum(value)
                        }
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" name="Receita" radius={[4, 4, 0, 0]}>
                        {comparativo.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Bar>
                      <Bar yAxisId="right" dataKey="orders" name="Pedidos" radius={[4, 4, 0, 0]} fill="hsl(var(--muted-foreground))" opacity={0.5} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marketplace</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">Taxa Aprovação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparativo.map((mp) => (
                      <TableRow key={mp.key}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mp.color }} />
                            {mp.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{fmt(mp.revenue)}</TableCell>
                        <TableCell className="text-right">{fmtNum(mp.orders)}</TableCell>
                        <TableCell className="text-right">{fmt(mp.avgTicket)}</TableCell>
                        <TableCell className="text-right">{mp.approvalRate.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* === CURVA ABC === */}
        <TabsContent value="abc">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Curva ABC de Produtos</CardTitle>
                <CardDescription>Classificação 80/20 por receita — todos os marketplaces</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={paretoData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(value: number, name: string) =>
                          name === "Receita" ? fmt(value) : `${value}%`
                        }
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" dataKey="cumPct" name="% Acumulado" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {(["A", "B", "C"] as const).map((cls) => {
                    const items = abcProducts.filter((p) => p.classification === cls);
                    const rev = items.reduce((s, p) => s + p.revenue, 0);
                    const bg = cls === "A" ? "bg-green-500/10 text-green-700" : cls === "B" ? "bg-yellow-500/10 text-yellow-700" : "bg-red-500/10 text-red-700";
                    return (
                      <div key={cls} className={`rounded-lg p-4 ${bg}`}>
                        <div className="text-2xl font-bold">Classe {cls}</div>
                        <div className="text-sm">{items.length} produtos · {fmt(rev)}</div>
                      </div>
                    );
                  })}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Classe</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Marketplace</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">% Acum.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abcProducts.slice(0, 25).map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            p.classification === "A" ? "bg-green-500/20 text-green-700" :
                            p.classification === "B" ? "bg-yellow-500/20 text-yellow-700" :
                            "bg-red-500/20 text-red-700"
                          }`}>{p.classification}</span>
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                        <TableCell>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${p.mpColor}20`, color: p.mpColor }}>
                            {p.marketplace}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{p.qty_sold}</TableCell>
                        <TableCell className="text-right">{fmt(p.revenue)}</TableCell>
                        <TableCell className="text-right">{p.cumulativePct.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* === CANCELAMENTO === */}
        <TabsContent value="cancelamento">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Cancelamento</CardTitle>
                <CardDescription>Pedidos cancelados vs. total — últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cancelData} layout="vertical" barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                        <Bar dataKey="rate" name="Taxa Cancel." radius={[0, 4, 4, 0]}>
                          {cancelData.map((e, i) => (
                            <Cell key={i} fill={e.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cancelData}
                          dataKey="cancelled"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {cancelData.map((e, i) => (
                            <Cell key={i} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmtNum(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marketplace</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Cancelados</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cancelData.map((mp, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mp.color }} />
                            {mp.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{fmtNum(mp.orders)}</TableCell>
                        <TableCell className="text-right">{fmtNum(mp.cancelled)}</TableCell>
                        <TableCell className="text-right">{mp.rate.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* === MARGEM === */}
        <TabsContent value="margem">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Margem por Marketplace</CardTitle>
                <CardDescription>Receita líquida após comissões e frete estimados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={marginData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="grossRevenue" name="Receita Bruta" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="commission" name="Comissão" stackId="b" fill="hsl(var(--destructive))" opacity={0.7} />
                      <Bar dataKey="freight" name="Frete" stackId="b" fill="hsl(var(--muted-foreground))" opacity={0.5} />
                      <Bar dataKey="netRevenue" name="Receita Líquida" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marketplace</TableHead>
                      <TableHead className="text-right">Receita Bruta</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-right">Frete</TableHead>
                      <TableHead className="text-right">Receita Líquida</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marginData.map((mp, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mp.color }} />
                            {mp.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{fmt(mp.grossRevenue)}</TableCell>
                        <TableCell className="text-right text-destructive">{fmt(mp.commission)} ({mp.commissionPct}%)</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmt(mp.freight)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(mp.netRevenue)}</TableCell>
                        <TableCell className="text-right font-bold">
                          <span className={mp.marginPct >= 60 ? "text-green-600" : mp.marginPct >= 50 ? "text-yellow-600" : "text-red-600"}>
                            {mp.marginPct}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
