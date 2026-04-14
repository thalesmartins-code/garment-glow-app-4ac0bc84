import { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, ShoppingCart, Receipt, Eye, Percent, Maximize2, Settings2 } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";
import { format } from "date-fns";

// ─── Seller definitions ───
const SELLERS = [
  {
    id: "8c57110c-77bc-4603-a959-01e965fbea3a",
    name: "Sandrini",
    initials: "SA",
    logo: "https://http2.mlstatic.com/D_NQ_NP_788484-MLA84290244651_052025-F.jpg",
  },
  {
    id: "52a7ed04-0d06-4ef5-ae6c-4f3e08a12867",
    name: "Buy Clock",
    initials: "BC",
    logo: "https://http2.mlstatic.com/D_NQ_NP_943366-MLA91442251991_092025-F.jpg",
  },
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

interface HourlyRow { hour: number; revenue: number; orders: number; }
interface ProductRow { item_id: string; title: string; thumbnail: string | null; qty_sold: number; revenue: number; }

const TVModeVendas = () => {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const [cycleSec, setCycleSec] = useState(() => getStored(STORAGE_KEY_CYCLE, 15));
  const [refreshMin, setRefreshMin] = useState(() => getStored(STORAGE_KEY_REFRESH, 5));
  const [sellerIdx, setSellerIdx] = useState(0);
  const [clock, setClock] = useState(new Date());
  const [cycleProgress, setCycleProgress] = useState(0);

  // Data state
  const [kpi, setKpi] = useState({ revenue: 0, orders: 0, ticket: 0, visits: 0, conversion: 0 });
  const [hourly, setHourly] = useState<HourlyRow[]>([]);
  const [topProducts, setTopProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);

  const seller = SELLERS[sellerIdx];

  // Persist settings
  useEffect(() => { localStorage.setItem(STORAGE_KEY_CYCLE, String(cycleSec)); }, [cycleSec]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_REFRESH, String(refreshMin)); }, [refreshMin]);

  // Clock
  useEffect(() => {
    const i = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  // Cycle sellers
  useEffect(() => {
    const i = setInterval(() => {
      setSellerIdx((prev) => (prev + 1) % SELLERS.length);
    }, cycleSec * 1000);
    return () => clearInterval(i);
  }, [cycleSec]);

  // Progress bar
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

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [dailyRes, hourlyRes, productsRes] = await Promise.all([
        supabase
          .from("ml_daily_cache")
          .select("total_revenue, qty_orders, unique_visits, units_sold")
          .eq("seller_id", seller.id)
          .eq("date", today),
        supabase
          .from("ml_hourly_cache")
          .select("hour, total_revenue, qty_orders")
          .eq("seller_id", seller.id)
          .eq("date", today)
          .order("hour", { ascending: true })
          .limit(200),
        supabase
          .from("ml_product_daily_cache")
          .select("item_id, title, thumbnail, qty_sold, revenue")
          .eq("seller_id", seller.id)
          .eq("date", today)
          .order("revenue", { ascending: false })
          .limit(50),
      ]);

      // Aggregate daily across all stores
      const daily = dailyRes.data || [];
      const revenue = daily.reduce((s, r) => s + Number(r.total_revenue), 0);
      const orders = daily.reduce((s, r) => s + Number(r.qty_orders), 0);
      const visits = daily.reduce((s, r) => s + Number(r.unique_visits), 0);
      const ticket = orders > 0 ? revenue / orders : 0;
      const conversion = visits > 0 ? (orders / visits) * 100 : 0;
      setKpi({ revenue, orders, ticket, visits, conversion });

      // Aggregate hourly by hour
      const hourlyMap: Record<number, HourlyRow> = {};
      (hourlyRes.data || []).forEach((r) => {
        if (!hourlyMap[r.hour]) hourlyMap[r.hour] = { hour: r.hour, revenue: 0, orders: 0 };
        hourlyMap[r.hour].revenue += Number(r.total_revenue);
        hourlyMap[r.hour].orders += Number(r.qty_orders);
      });
      // Fill 0-23
      const fullHourly: HourlyRow[] = [];
      for (let h = 0; h <= 23; h++) {
        fullHourly.push(hourlyMap[h] || { hour: h, revenue: 0, orders: 0 });
      }
      setHourly(fullHourly);

      // Aggregate products by item_id
      const prodMap: Record<string, ProductRow> = {};
      (productsRes.data || []).forEach((r) => {
        if (!prodMap[r.item_id]) {
          prodMap[r.item_id] = { item_id: r.item_id, title: r.title, thumbnail: r.thumbnail, qty_sold: 0, revenue: 0 };
        }
        prodMap[r.item_id].qty_sold += Number(r.qty_sold);
        prodMap[r.item_id].revenue += Number(r.revenue);
      });
      const sorted = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      setTopProducts(sorted);
    } catch (err) {
      console.error("TVModeVendas: fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [user, seller.id, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    const i = setInterval(fetchData, refreshMin * 60_000);
    return () => clearInterval(i);
  }, [refreshMin, fetchData]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  const totalProductRevenue = topProducts.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col gap-4 select-none">
      {/* ─── Top bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <img src={seller.logo} alt={seller.name} className="h-10 w-10 rounded-lg object-cover" />
            <div>
              <h1 className="text-2xl font-bold leading-tight">{seller.name}</h1>
              <p className="text-xs text-muted-foreground">Hoje · Todas as lojas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {SELLERS.map((s, idx) => (
              <div
                key={s.id}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-500 ${
                  idx === sellerIdx
                    ? "bg-primary text-primary-foreground scale-105"
                    : "bg-muted text-muted-foreground scale-95 opacity-50"
                }`}
              >
                {s.initials}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{formatTime(clock)}</div>
            <div className="text-xs text-muted-foreground capitalize">{formatDate(clock)}</div>
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

      {/* ─── Progress bar ─── */}
      <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-100 ease-linear" style={{ width: `${cycleProgress}%` }} />
      </div>

      {/* ─── KPI Row ─── */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard
          title="Receita Total"
          value={formatCurrency(kpi.revenue)}
          rawValue={kpi.revenue}
          valuePrefix="R$ "
          icon={<DollarSign className="w-5 h-5" />}
          variant="purple"
          size="compact"
          refreshing={loading}
        />
        <KPICard
          title="Pedidos"
          value={String(kpi.orders)}
          rawValue={kpi.orders}
          icon={<ShoppingCart className="w-5 h-5" />}
          variant="info"
          size="compact"
          refreshing={loading}
        />
        <KPICard
          title="Ticket Médio"
          value={formatCurrency(kpi.ticket)}
          rawValue={kpi.ticket}
          valuePrefix="R$ "
          icon={<Receipt className="w-5 h-5" />}
          variant="orange"
          size="compact"
          refreshing={loading}
        />
        <KPICard
          title="Visitas"
          value={new Intl.NumberFormat("pt-BR").format(kpi.visits)}
          rawValue={kpi.visits}
          icon={<Eye className="w-5 h-5" />}
          variant="neutral"
          size="compact"
          refreshing={loading}
        />
        <KPICard
          title="Conversão"
          value={`${kpi.conversion.toFixed(1)}%`}
          rawValue={kpi.conversion}
          valueSuffix="%"
          valueDecimals={1}
          icon={<Percent className="w-5 h-5" />}
          variant={kpi.conversion >= 5 ? "success" : kpi.conversion >= 2 ? "warning" : "danger"}
          size="compact"
          refreshing={loading}
        />
      </div>

      {/* ─── Main content: Chart + Top Products ─── */}
      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {/* Hourly chart */}
        <div className="col-span-2 bg-card rounded-xl p-4 flex flex-col">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Receita por Hora</h2>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(h) => `${String(h).padStart(2, "0")}h`} />
                <YAxis yAxisId="revenue" orientation="left" tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(value: number, name: string) => [
                    name === "revenue" ? formatCurrency(value) : value,
                    name === "revenue" ? "Receita" : "Pedidos",
                  ]}
                  labelFormatter={(h) => `${String(h).padStart(2, "0")}:00`}
                />
                <Area yAxisId="revenue" dataKey="revenue" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth={2} type="monotone" />
                <Bar yAxisId="orders" dataKey="orders" fill="hsl(var(--primary) / 0.6)" radius={[4, 4, 0, 0]} barSize={14} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top products */}
        <div className="col-span-1 bg-card rounded-xl p-4 flex flex-col">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Top 5 Anúncios</h2>
          <div className="flex-1 overflow-auto space-y-2">
            {topProducts.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados para hoje</p>
            )}
            {topProducts.map((p, idx) => {
              const share = totalProductRevenue > 0 ? (p.revenue / totalProductRevenue) * 100 : 0;
              return (
                <div key={p.item_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-lg font-bold text-muted-foreground w-6 text-center">{idx + 1}</span>
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{p.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{p.qty_sold} un.</span>
                      <span>·</span>
                      <span>{formatCurrency(p.revenue)}</span>
                      <span>·</span>
                      <span>{share.toFixed(1)}%</span>
                    </div>
                    {/* Mini progress */}
                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(share, 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Atualização a cada {refreshMin} min · Alternância a cada {cycleSec}s</span>
        <span>Última atualização: {formatTime(clock)}</span>
      </div>
    </div>
  );
};

export default TVModeVendas;
