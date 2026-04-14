import { useState, useEffect, useCallback } from "react";
import { DollarSign, ShoppingCart, Receipt, Eye, Percent, Maximize2, Settings2 } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import {
  ComposedChart, BarChart, Bar, Cell, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";
import { format } from "date-fns";
import { STORE_STROKE_COLORS } from "@/config/storeColors";

const SELLERS = [
  { id: "8c57110c-77bc-4603-a959-01e965fbea3a", name: "Sandrini", initials: "SA", logo: "https://http2.mlstatic.com/D_NQ_NP_788484-MLA84290244651_052025-F.jpg" },
  { id: "52a7ed04-0d06-4ef5-ae6c-4f3e08a12867", name: "Buy Clock", initials: "BC", logo: "https://http2.mlstatic.com/D_NQ_NP_943366-MLA91442251991_092025-F.jpg" },
];

const STORAGE_KEY_CYCLE = "tv_vendas_cycle_s";
const STORAGE_KEY_REFRESH = "tv_vendas_refresh_min";

function getStored(key: string, fallback: number) {
  try { const v = localStorage.getItem(key); if (v) return Number(v); } catch {}
  return fallback;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const formatTime = (d: Date) =>
  d.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const formatDate = (d: Date) =>
  d.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).replace(/-feira/g, "");

interface StoreInfo { ml_user_id: string; name: string; }
interface ProductRow { item_id: string; title: string; thumbnail: string | null; qty_sold: number; revenue: number; stock: number | null; }
interface BrandRow { name: string; revenue: number; }

interface SellerData {
  kpi: { revenue: number; orders: number; ticket: number; visits: number; conversion: number };
  overlaidData: Record<string, any>[];
  storeNames: StoreInfo[];
  topProducts: ProductRow[];
  brandData: BrandRow[];
}

const BRAND_COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(25,95%,53%)", "hsl(270,70%,50%)",
  "hsl(160,60%,45%)", "hsl(340,75%,55%)", "hsl(200,70%,50%)", "hsl(45,93%,47%)",
  "hsl(290,50%,55%)", "hsl(15,80%,50%)",
];


const MEDALS = ["🥇", "🥈", "🥉"];

const TVModeVendas = () => {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const [cycleSec, setCycleSec] = useState(() => getStored(STORAGE_KEY_CYCLE, 15));
  const [refreshMin, setRefreshMin] = useState(() => getStored(STORAGE_KEY_REFRESH, 5));
  const [sellerIdx, setSellerIdx] = useState(0);
  const [clock, setClock] = useState(new Date());
  const [cycleProgress, setCycleProgress] = useState(0);

  // Cache all sellers' data in a map — only re-fetch on refresh interval
  const [sellerCache, setSellerCache] = useState<Record<string, SellerData>>({});
  const [loading, setLoading] = useState(true);

  const seller = SELLERS[sellerIdx];
  const emptyData: SellerData = {
    kpi: { revenue: 0, orders: 0, ticket: 0, visits: 0, conversion: 0 },
    overlaidData: [], storeNames: [], topProducts: [], brandData: [],
  };
  const current = sellerCache[seller.id] || emptyData;

  useEffect(() => { localStorage.setItem(STORAGE_KEY_CYCLE, String(cycleSec)); }, [cycleSec]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_REFRESH, String(refreshMin)); }, [refreshMin]);

  useEffect(() => {
    const i = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const i = setInterval(() => setSellerIdx((prev) => (prev + 1) % SELLERS.length), cycleSec * 1000);
    return () => clearInterval(i);
  }, [cycleSec]);

  useEffect(() => {
    setCycleProgress(0);
    const ms = cycleSec * 1000;
    const i = setInterval(() => {
      setCycleProgress((prev) => {
        const next = prev + (100 / (ms / 100));
        return next >= 100 ? 0 : next;
      });
    }, 100);
    return () => clearInterval(i);
  }, [sellerIdx, cycleSec]);

  // Fetch data for a single seller and return the processed result
  const fetchSellerData = useCallback(async (sellerId: string): Promise<SellerData> => {
    const [dailyRes, hourlyRes, productsRes, storesRes, tokensRes] = await Promise.all([
      supabase.from("ml_daily_cache").select("total_revenue, qty_orders, unique_visits, units_sold").eq("seller_id", sellerId).eq("date", today),
      supabase.from("ml_hourly_cache").select("hour, total_revenue, qty_orders, ml_user_id").eq("seller_id", sellerId).eq("date", today).order("hour", { ascending: true }).limit(200),
      supabase.from("ml_product_daily_cache").select("item_id, title, thumbnail, qty_sold, revenue").eq("seller_id", sellerId).eq("date", today).order("revenue", { ascending: false }).limit(50),
      supabase.from("ml_user_cache").select("ml_user_id, custom_name, nickname").eq("seller_id", sellerId),
      supabase.from("ml_tokens").select("access_token").eq("seller_id", sellerId),
    ]);

    // KPIs
    const daily = dailyRes.data || [];
    const revenue = daily.reduce((s, r) => s + Number(r.total_revenue), 0);
    const orders = daily.reduce((s, r) => s + Number(r.qty_orders), 0);
    const visits = daily.reduce((s, r) => s + Number(r.unique_visits), 0);
    const ticket = orders > 0 ? revenue / orders : 0;
    const conversion = visits > 0 ? (orders / visits) * 100 : 0;

    // Store names
    const stores: StoreInfo[] = (storesRes.data || []).map((s) => ({
      ml_user_id: String(s.ml_user_id),
      name: s.custom_name || s.nickname || String(s.ml_user_id),
    }));

    // Hourly data
    const hourlyRows = hourlyRes.data || [];
    const uniqueIds = [...new Set(hourlyRows.map((r) => String(r.ml_user_id)))];
    const storeNameMap: Record<string, string> = {};
    for (const st of stores) storeNameMap[st.ml_user_id] = st.name;
    for (const id of uniqueIds) if (!storeNameMap[id]) storeNameMap[id] = id;
    const overlaidData = Array.from({ length: 24 }, (_, hour) => {
      const row: Record<string, any> = { label: `${String(hour).padStart(2, "0")}h`, hour };
      for (const id of uniqueIds) {
        const name = storeNameMap[id];
        const matching = hourlyRows.filter((r) => r.hour === hour && String(r.ml_user_id) === id);
        row[name] = matching.reduce((s, r) => s + Number(r.total_revenue), 0);
      }
      return row;
    });

    // Inventory (stock + brand)
    const stockMap: Record<string, number> = {};
    const brandByItemId: Record<string, string> = {};
    const tokens = (tokensRes.data || []).map((t) => t.access_token).filter(Boolean);
    try {
      for (const token of tokens) {
        const { data: invData } = await supabase.functions.invoke("ml-inventory", { body: { access_token: token } });
        if (invData?.items) {
          for (const item of invData.items) {
            stockMap[item.id] = (stockMap[item.id] || 0) + (item.available_quantity || 0);
            if (item.brand) brandByItemId[item.id] = item.brand;
          }
        }
      }
    } catch { /* optional */ }

    // Products
    const prodMap: Record<string, ProductRow> = {};
    (productsRes.data || []).forEach((r) => {
      if (!prodMap[r.item_id]) prodMap[r.item_id] = { item_id: r.item_id, title: r.title, thumbnail: r.thumbnail, qty_sold: 0, revenue: 0, stock: stockMap[r.item_id] ?? null };
      prodMap[r.item_id].qty_sold += Number(r.qty_sold);
      prodMap[r.item_id].revenue += Number(r.revenue);
    });
    const allProds = Object.values(prodMap);
    const topProducts = [...allProds].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Brand aggregation
    const brandRevMap: Record<string, number> = {};
    allProds.forEach((p) => {
      const brand = brandByItemId[p.item_id] || "Sem marca";
      brandRevMap[brand] = (brandRevMap[brand] || 0) + p.revenue;
    });
    const brandData = Object.entries(brandRevMap)
      .map(([name, rev]) => ({ name, revenue: rev }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      kpi: { revenue, orders, ticket, visits, conversion },
      overlaidData, storeNames: stores, topProducts, brandData,
    };
  }, [today]);

  // Fetch ALL sellers in parallel and cache results
  const fetchAllSellers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        SELLERS.map(async (s) => ({ id: s.id, data: await fetchSellerData(s.id) }))
      );
      const cache: Record<string, SellerData> = {};
      for (const r of results) cache[r.id] = r.data;
      setSellerCache(cache);
    } catch (err) {
      console.error("TVModeVendas: fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchSellerData]);

  // Fetch once on mount, then on refresh interval
  useEffect(() => { fetchAllSellers(); }, [fetchAllSellers]);

  useEffect(() => {
    const i = setInterval(fetchAllSellers, refreshMin * 60_000);
    return () => clearInterval(i);
  }, [refreshMin, fetchAllSellers]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  const totalProductRevenue = current.topProducts.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col gap-4 select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4">
            <img src={seller.logo} alt={seller.name} className="h-14 w-14 rounded-xl object-cover" />
            <div>
              <h1 className="text-4xl font-bold leading-tight">{seller.name}</h1>
              <p className="text-sm text-muted-foreground">Hoje · Todas as lojas</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl font-bold">{formatTime(clock)}</div>
            <div className="text-sm text-muted-foreground capitalize">{formatDate(clock)}</div>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <Settings2 className="w-5 h-5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-5" align="end">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Alternar seller: {cycleSec}s</Label>
                <Slider value={[cycleSec]} onValueChange={([v]) => setCycleSec(v)} min={5} max={60} step={5} />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Atualizar dados: {refreshMin} min</Label>
                <Slider value={[refreshMin]} onValueChange={([v]) => setRefreshMin(v)} min={1} max={30} step={1} />
              </div>
            </PopoverContent>
          </Popover>
          <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <Maximize2 className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-100 ease-linear" style={{ width: `${cycleProgress}%` }} />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard title="Receita Total" value={formatCurrency(current.kpi.revenue)} rawValue={current.kpi.revenue} valuePrefix="R$ " icon={<DollarSign className="w-6 h-6" />} variant="minimal" iconClassName="bg-accent/10 text-accent" size="tv" refreshing={loading} />
        <KPICard title="Pedidos" value={String(current.kpi.orders)} rawValue={current.kpi.orders} icon={<ShoppingCart className="w-6 h-6" />} variant="minimal" iconClassName="bg-[hsl(270,70%,50%)]/10 text-[hsl(270,70%,50%)]" size="tv" refreshing={loading} />
        <KPICard title="Ticket Médio" value={formatCurrency(current.kpi.ticket)} rawValue={current.kpi.ticket} valuePrefix="R$ " icon={<Receipt className="w-6 h-6" />} variant="minimal" iconClassName="bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]" size="tv" refreshing={loading} />
        <KPICard title="Visitas" value={new Intl.NumberFormat("pt-BR").format(current.kpi.visits)} rawValue={current.kpi.visits} icon={<Eye className="w-6 h-6" />} variant="minimal" iconClassName="bg-accent/10 text-accent" size="tv" refreshing={loading} />
        <KPICard title="Conversão" value={`${current.kpi.conversion.toFixed(1)}%`} rawValue={current.kpi.conversion} valueSuffix="%" valueDecimals={1} icon={<Percent className="w-6 h-6" />} variant="minimal" iconClassName="bg-success/10 text-success" size="tv" refreshing={loading} />
      </div>

      {/* Main content: Charts left + Top Products right */}
      <div className="flex-1 grid grid-cols-7 gap-4 min-h-0">
        {/* Left column: stacked charts */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          {/* Hourly chart — smaller */}
          <Card className="flex flex-col" style={{ flex: "0 0 40%" }}>
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Receita por Hora — Todas as Lojas</span>
              <div className="flex items-center gap-4">
                {current.storeNames.map((st, idx) => (
                  <div key={st.ml_user_id} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STORE_STROKE_COLORS[idx % STORE_STROKE_COLORS.length] }} />
                    <span className="text-sm text-muted-foreground">{st.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <CardContent className="flex-1 px-4 pb-2 pt-0 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={current.overlaidData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 14, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" interval={2} />
                  <YAxis tick={{ fontSize: 14, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [formatCurrency(Number(value)), name]}
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  />
                  {current.storeNames.map((st, idx) => (
                    <Line
                      key={st.ml_user_id}
                      type="monotone"
                      dataKey={st.name}
                      stroke={STORE_STROKE_COLORS[idx % STORE_STROKE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Brand chart — taller */}
          <Card className="flex flex-col min-h-0" style={{ flex: "0 0 calc(60% - 1rem)" }}>
            <div className="px-4 pt-4 pb-3">
              <span className="text-sm font-medium text-foreground">Receita por Marca (Top 10)</span>
            </div>
            <CardContent className="flex-1 px-4 pb-3 pt-0 min-h-0">
              {current.brandData.length === 0 && !loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={current.brandData} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={120} fontSize={15} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <RechartsTooltip
                      formatter={(value: number) => [formatCurrency(value), "Receita"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
                    />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                      {current.brandData.map((_, idx) => (
                        <Cell key={idx} fill={BRAND_COLORS[idx % BRAND_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top products — wider (4/7) */}
        <Card className="col-span-4 flex flex-col">
          <div className="px-5 pt-4 pb-3">
            <span className="text-sm font-medium text-foreground">Top 10 Anúncios</span>
          </div>
          <CardContent className="flex-1 flex flex-col px-5 pb-2 pt-0 overflow-hidden">
            <div className="flex-1 overflow-auto">
              {current.topProducts.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados para hoje</p>
              )}
              {current.topProducts.length > 0 && (
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-10" />
                    <col className="w-14" />
                    <col />
                    <col className="w-20" />
                    <col className="w-20" />
                    <col className="w-24" />
                    <col className="w-16" />
                  </colgroup>
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/50 text-xs">
                      <th className="text-left py-2.5">#</th>
                      <th className="text-left py-2.5" colSpan={2}>Produto</th>
                      <th className="text-right py-2.5">Estoque</th>
                      <th className="text-right py-2.5">Vendidos</th>
                      <th className="text-right py-2.5">Receita</th>
                      <th className="text-right py-2.5">% Part.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.topProducts.map((p, idx) => {
                      const share = totalProductRevenue > 0 ? (p.revenue / totalProductRevenue) * 100 : 0;
                      return (
                        <tr key={p.item_id} className="border-b border-border/30">
                          <td className="text-center font-bold text-muted-foreground text-lg py-2.5">
                            {idx < 3 ? MEDALS[idx] : idx + 1}
                          </td>
                          <td className="py-2 pl-1">
                            {p.thumbnail ? (
                              <img src={p.thumbnail} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-muted shrink-0" />
                            )}
                          </td>
                          <td className="py-2 pl-2 overflow-hidden">
                            <p className="truncate text-foreground text-[15px]">{p.title}</p>
                          </td>
                          <td className="text-right text-[15px] whitespace-nowrap">
                            {p.stock !== null ? (
                              <span className={p.stock === 0 ? "text-destructive font-semibold" : p.stock <= 5 ? "text-warning font-semibold" : "text-muted-foreground"}>
                                {p.stock}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="text-right font-semibold text-foreground text-[15px] whitespace-nowrap">{p.qty_sold} un</td>
                          <td className="text-right font-semibold text-foreground text-[15px] whitespace-nowrap">{formatCurrency(p.revenue)}</td>
                          <td className="text-right text-muted-foreground text-[15px] whitespace-nowrap">{share.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Atualização a cada {refreshMin} min · Alternância a cada {cycleSec}s</span>
        <span>Última atualização: {formatTime(clock)}</span>
      </div>
    </div>
  );
};

export default TVModeVendas;
