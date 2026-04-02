import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, FileText, TrendingDown, DollarSign, ArrowUpDown, Trophy, MapPin, CalendarRange } from "lucide-react";
import { BrazilHeatMap } from "@/components/mercadolivre/BrazilHeatMap";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
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

const BRAZILIAN_STATES = [
  { uf: "SP", name: "São Paulo" }, { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "MG", name: "Minas Gerais" }, { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "PR", name: "Paraná" }, { uf: "BA", name: "Bahia" },
  { uf: "SC", name: "Santa Catarina" }, { uf: "GO", name: "Goiás" },
  { uf: "PE", name: "Pernambuco" }, { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" }, { uf: "PA", name: "Pará" },
  { uf: "ES", name: "Espírito Santo" }, { uf: "MT", name: "Mato Grosso" },
  { uf: "MA", name: "Maranhão" },
];

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
        name: mp.name, key: mp.key, color: mp.color,
        revenue: totalRevenue, orders: totalOrders, avgTicket, approvalRate, cancelled: totalCancelled,
      };
    });

    // Curva ABC
    const allProducts = MARKETPLACES.flatMap((mp) =>
      getMarketplaceProducts(mp.key).map((p) => ({ ...p, marketplace: mp.name, mpColor: mp.color, mpKey: mp.key }))
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

    const paretoData = abcProducts.slice(0, 20).map((p) => ({
      name: p.title.length > 25 ? p.title.slice(0, 22) + "…" : p.title,
      revenue: Math.round(p.revenue),
      cumPct: Math.round(p.cumulativePct * 10) / 10,
    }));

    // Cancelamento
    const cancelData = comparativo.map((mp) => ({
      name: mp.name, color: mp.color, orders: mp.orders, cancelled: mp.cancelled,
      rate: mp.orders > 0 ? (mp.cancelled / mp.orders) * 100 : 0,
    }));

    // Margem
    const commissions: Record<string, number> = { "mercado-livre": 0.16, amazon: 0.15, shopee: 0.20, magalu: 0.18 };
    const marginData = comparativo.map((mp) => {
      const commission = commissions[mp.key] || 0.15;
      const grossRevenue = mp.revenue;
      const commissionValue = grossRevenue * commission;
      const freight = mp.orders * 12;
      const netRevenue = grossRevenue - commissionValue - freight;
      const marginPct = grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0;
      return {
        name: mp.name, color: mp.color,
        grossRevenue: Math.round(grossRevenue), commission: Math.round(commissionValue),
        commissionPct: Math.round(commission * 100), freight: Math.round(freight),
        netRevenue: Math.round(netRevenue), marginPct: Math.round(marginPct * 10) / 10,
      };
    });

    // === TOP PRODUCTS RANKING (cross-marketplace) ===
    // Group by title (simulating SKU grouping)
    const productMap = new Map<string, { title: string; totalRevenue: number; totalQty: number; marketplaces: Set<string>; thumbnail: string | null }>();
    allProducts.forEach((p) => {
      const key = p.title;
      const existing = productMap.get(key);
      if (existing) {
        existing.totalRevenue += p.revenue;
        existing.totalQty += p.qty_sold;
        existing.marketplaces.add(p.marketplace);
      } else {
        productMap.set(key, {
          title: p.title, totalRevenue: p.revenue, totalQty: p.qty_sold,
          marketplaces: new Set([p.marketplace]), thumbnail: p.thumbnail,
        });
      }
    });
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 20)
      .map((p, i) => ({ ...p, rank: i + 1, marketplaces: Array.from(p.marketplaces) }));

    const topProductsChartData = topProducts.slice(0, 10).map((p) => ({
      name: p.title.length > 20 ? p.title.slice(0, 17) + "…" : p.title,
      revenue: Math.round(p.totalRevenue),
      qty: p.totalQty,
    }));

    // === GEOGRAPHIC DATA (simulated by state) ===
    const seed = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
      return Math.abs(h);
    };
    const totalOrdersAll = comparativo.reduce((s, mp) => s + mp.orders, 0);
    const stateWeights: Record<string, number> = {
      SP: 0.32, RJ: 0.12, MG: 0.10, RS: 0.07, PR: 0.07, BA: 0.05, SC: 0.05,
      GO: 0.04, PE: 0.04, CE: 0.03, DF: 0.03, PA: 0.02, ES: 0.02, MT: 0.02, MA: 0.02,
    };
    const geoData = BRAZILIAN_STATES.map((st) => {
      const weight = stateWeights[st.uf] || 0.01;
      const orders = Math.round(totalOrdersAll * weight * (0.8 + (seed(st.uf) % 40) / 100));
      const revenue = orders * (80 + (seed(st.uf + "r") % 120));
      const avgTicket = orders > 0 ? revenue / orders : 0;
      return { ...st, orders, revenue, avgTicket, pct: 0 };
    }).sort((a, b) => b.orders - a.orders);
    const totalGeoOrders = geoData.reduce((s, g) => s + g.orders, 0);
    geoData.forEach((g) => { g.pct = totalGeoOrders > 0 ? (g.orders / totalGeoOrders) * 100 : 0; });

    // === SEASONALITY YoY (simulated monthly) ===
    const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const seasonalityData = MONTHS.map((month, i) => {
      const baseCurrentYear = 80000 + (seed(month) % 60000);
      const basePrevYear = baseCurrentYear * (0.7 + (seed(month + "prev") % 30) / 100);
      const seasonalMultiplier = [0.8, 0.75, 0.85, 0.9, 0.95, 1.0, 0.9, 0.95, 1.0, 1.05, 1.3, 1.5][i];
      const currentYear = Math.round(baseCurrentYear * seasonalMultiplier);
      const prevYear = Math.round(basePrevYear * seasonalMultiplier * 0.9);
      const growth = prevYear > 0 ? ((currentYear - prevYear) / prevYear) * 100 : 0;
      return { month, currentYear, prevYear, growth: Math.round(growth * 10) / 10 };
    });

    return { comparativo, abcProducts, paretoData, cancelData, marginData, topProducts, topProductsChartData, geoData, seasonalityData };
  }, []);
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v: number) => v.toLocaleString("pt-BR");

export default function MLRelatorios() {
  const { comparativo, abcProducts, paretoData, cancelData, marginData, topProducts, topProductsChartData, geoData, seasonalityData } = useReportData();

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
        <TabsList className="flex flex-wrap h-auto gap-1 max-w-5xl">
          <TabsTrigger value="comparativo" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Comparativo</span>
          </TabsTrigger>
          <TabsTrigger value="ranking" className="gap-1.5 text-xs sm:text-sm">
            <Trophy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ranking</span>
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
          <TabsTrigger value="geo" className="gap-1.5 text-xs sm:text-sm">
            <MapPin className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Geográfico</span>
          </TabsTrigger>
          <TabsTrigger value="sazonalidade" className="gap-1.5 text-xs sm:text-sm">
            <CalendarRange className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sazonalidade</span>
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
                      <Tooltip formatter={(value: number, name: string) => name === "Receita" ? fmt(value) : fmtNum(value)} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" name="Receita" radius={[4, 4, 0, 0]}>
                        {comparativo.map((e, i) => (<Cell key={i} fill={e.color} />))}
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

        {/* === RANKING DE PRODUTOS === */}
        <TabsContent value="ranking">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Produtos</CardTitle>
                <CardDescription>Top produtos por receita consolidada — todos os marketplaces</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProductsChartData} layout="vertical" barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number, name: string) => name === "Receita" ? fmt(v) : fmtNum(v)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Receita" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
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
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Marketplaces</TableHead>
                      <TableHead className="text-right">Qtd Vendida</TableHead>
                      <TableHead className="text-right">Receita Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((p) => (
                      <TableRow key={p.rank}>
                        <TableCell>
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            p.rank <= 3 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            {p.rank}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium max-w-[250px] truncate">
                          <div className="flex items-center gap-2">
                            {p.thumbnail && <img src={p.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />}
                            <span className="truncate">{p.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {p.marketplaces.map((mp) => {
                              const mpData = MARKETPLACES.find((m) => m.name === mp);
                              return (
                                <span key={mp} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${mpData?.color}20`, color: mpData?.color }}>
                                  {mp}
                                </span>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{fmtNum(p.totalQty)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(p.totalRevenue)}</TableCell>
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
                      <Tooltip formatter={(value: number, name: string) => name === "Receita" ? fmt(value) : `${value}%`} />
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
                          {cancelData.map((e, i) => (<Cell key={i} fill={e.color} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={cancelData} dataKey="cancelled" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                          {cancelData.map((e, i) => (<Cell key={i} fill={e.color} />))}
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
                      <Bar dataKey="grossRevenue" name="Receita Bruta" stackId="a" fill="hsl(var(--primary))" />
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

        {/* === GEOGRÁFICO === */}
        <TabsContent value="geo">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mapa de Calor — Brasil</CardTitle>
                <CardDescription>Concentração de pedidos por estado — todos os marketplaces</CardDescription>
              </CardHeader>
              <CardContent>
                <BrazilHeatMap data={geoData} />
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {geoData.slice(0, 5).map((st) => (
                <Card key={st.uf}>
                  <CardContent className="pt-4 pb-3 px-4">
                    <p className="text-xs text-muted-foreground">{st.name}</p>
                    <p className="text-lg font-bold">{fmtNum(st.orders)} pedidos</p>
                    <p className="text-xs text-muted-foreground">{fmt(st.revenue)} · {st.pct.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* === SAZONALIDADE === */}
        <TabsContent value="sazonalidade">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sazonalidade (YoY)</CardTitle>
                <CardDescription>Comparação mês a mês — Ano atual vs. ano anterior</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={seasonalityData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === "Crescimento") return `${value}%`;
                          return fmt(value);
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="currentYear" name="Ano Atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.9} />
                      <Bar yAxisId="left" dataKey="prevYear" name="Ano Anterior" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.4} />
                      <Line yAxisId="right" dataKey="growth" name="Crescimento" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(() => {
                const totalCurrent = seasonalityData.reduce((s, m) => s + m.currentYear, 0);
                const totalPrev = seasonalityData.reduce((s, m) => s + m.prevYear, 0);
                const avgGrowth = totalPrev > 0 ? ((totalCurrent - totalPrev) / totalPrev) * 100 : 0;
                const bestMonth = [...seasonalityData].sort((a, b) => b.currentYear - a.currentYear)[0];
                const bestGrowthMonth = [...seasonalityData].sort((a, b) => b.growth - a.growth)[0];
                return [
                  { label: "Receita Ano Atual", value: fmt(totalCurrent), sub: `vs. ${fmt(totalPrev)} anterior` },
                  { label: "Melhor Mês", value: bestMonth.month, sub: fmt(bestMonth.currentYear) },
                  { label: "Maior Crescimento", value: `${bestGrowthMonth.growth}%`, sub: `em ${bestGrowthMonth.month}` },
                ].map((card, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                    </CardContent>
                  </Card>
                ));
              })()}
            </div>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Ano Atual</TableHead>
                      <TableHead className="text-right">Ano Anterior</TableHead>
                      <TableHead className="text-right">Crescimento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seasonalityData.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{m.month}</TableCell>
                        <TableCell className="text-right">{fmt(m.currentYear)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmt(m.prevYear)}</TableCell>
                        <TableCell className="text-right">
                          <span className={m.growth >= 0 ? "text-green-600" : "text-red-600"}>
                            {m.growth >= 0 ? "+" : ""}{m.growth}%
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
