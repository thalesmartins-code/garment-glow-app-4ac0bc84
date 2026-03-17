import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HistoricalSyncModal } from "@/components/mercadolivre/HistoricalSyncModal";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Tag,
  Eye,
  Users,
  Percent,
  RefreshCw,
  ExternalLink,
  Plug,
  CalendarIcon,
  Info,
  Check,
  X,
  Clock3,
} from "lucide-react";
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface MLUser {
  id: number;
  nickname: string;
  country: string;
  permalink: string;
}

interface DailyBreakdown {
  date: string;
  total: number;
  approved: number;
  qty: number;
  cancelled: number;
  shipped: number;
  unique_visits: number;
  unique_buyers: number;
}

interface HourlyBreakdown {
  date: string;
  hour: number;
  total: number;
  approved: number;
  qty: number;
}

type ChartMode = "daily" | "hourly";
type DateRange = { from: Date; to?: Date } | null;

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const QUICK_RANGES = [
  { label: "Hoje", value: 0 },
  { label: "7 dias", value: 7 },
  { label: "15 dias", value: 15 },
  { label: "30 dias", value: 30 },
] as const;

const LAST_ML_SYNC_KEY = "ml_last_synced_at";

function todayUTC() {
  const now = new Date();
  return now.toISOString().substring(0, 10);
}

function cutoffDateStr(daysBack: number) {
  if (daysBack === 0) return todayUTC();
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().substring(0, 10);
}

function mapDailyRow(row: any): DailyBreakdown {
  return {
    date: row.date,
    total: Number(row.total_revenue ?? row.total ?? 0),
    approved: Number(row.approved_revenue ?? row.approved ?? 0),
    qty: Number(row.qty_orders ?? row.qty ?? 0),
    cancelled: Number(row.cancelled_orders ?? row.cancelled ?? 0),
    shipped: Number(row.shipped_orders ?? row.shipped ?? 0),
    unique_visits: Number(row.unique_visits ?? 0),
    unique_buyers: Number(row.unique_buyers ?? 0),
  };
}

function mapHourlyRow(row: any): HourlyBreakdown {
  return {
    date: row.date,
    hour: Number(row.hour ?? 0),
    total: Number(row.total_revenue ?? row.total ?? 0),
    approved: Number(row.approved_revenue ?? row.approved ?? 0),
    qty: Number(row.qty_orders ?? row.qty ?? 0),
  };
}

function buildHourlyChartData(hourlyRows: HourlyBreakdown[]) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, "0")}h`,
    hour,
    "Venda Total": 0,
    "Venda Aprovada": 0,
    Pedidos: 0,
  }));

  hourlyRows.forEach((row) => {
    const bucket = buckets[row.hour];
    if (!bucket) return;
    bucket["Venda Total"] += row.total;
    bucket["Venda Aprovada"] += row.approved;
    bucket.Pedidos += row.qty;
  });

  return buckets;
}

export default function MercadoLivre() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [mlUser, setMlUser] = useState<MLUser | null>(null);
  const [cachedAccessToken, setCachedAccessToken] = useState<string | null>(null);
  const [allDaily, setAllDaily] = useState<DailyBreakdown[]>([]);
  const [allHourly, setAllHourly] = useState<HourlyBreakdown[]>([]);
  const [period, setPeriod] = useState(0);
  const [customRange, setCustomRange] = useState<DateRange>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("daily");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStorage.getItem(LAST_ML_SYNC_KEY));
  const cacheLoadedRef = useRef(false);

  const isHourlyAvailable = !customRange && (period === 0 || period === 7);

  useEffect(() => {
    if (!isHourlyAvailable && chartMode === "hourly") {
      setChartMode("daily");
    }
  }, [isHourlyAvailable, chartMode]);

  const daily = allDaily.filter((d) => {
    if (customRange?.from) {
      const from = format(startOfDay(customRange.from), "yyyy-MM-dd");
      const to = format(startOfDay(customRange.to ?? customRange.from), "yyyy-MM-dd");
      return d.date >= from && d.date <= to;
    }
    const cutoff = cutoffDateStr(period);
    return d.date >= cutoff;
  });

  const hourly = allHourly.filter((d) => {
    if (!isHourlyAvailable) return false;
    const cutoff = cutoffDateStr(period);
    return d.date >= cutoff;
  });

  const periodLabel = customRange?.from
    ? customRange.to
      ? `${format(customRange.from, "dd/MM/yy")} – ${format(customRange.to, "dd/MM/yy")}`
      : `Início: ${format(customRange.from, "dd/MM/yy")}`
    : period === 0
      ? "Hoje"
      : `Últimos ${period} dias`;

  const metrics = daily.length > 0 ? {
    total_revenue: daily.reduce((s, d) => s + d.total, 0),
    approved_revenue: daily.reduce((s, d) => s + d.approved, 0),
    total_orders: daily.reduce((s, d) => s + d.qty, 0),
    unique_visits: daily.reduce((s, d) => s + (d.unique_visits || 0), 0),
    unique_buyers: daily.reduce((s, d) => s + (d.unique_buyers || 0), 0),
    avg_ticket: 0,
    conversion_rate: 0,
  } : null;

  if (metrics) {
    if (metrics.total_orders > 0) metrics.avg_ticket = metrics.total_revenue / metrics.total_orders;
    if (metrics.unique_visits > 0) metrics.conversion_rate = (metrics.unique_buyers / metrics.unique_visits) * 100;
  }

  const totals = {
    qty: daily.reduce((s, d) => s + d.qty, 0),
    total: daily.reduce((s, d) => s + d.total, 0),
    approved: daily.reduce((s, d) => s + d.approved, 0),
  };

  const loadHourlyCache = useCallback(async () => {
    if (!user) return [] as HourlyBreakdown[];

    const { data } = await (supabase as any)
      .from("ml_hourly_cache")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", cutoffDateStr(7))
      .order("date", { ascending: false })
      .order("hour", { ascending: true })
      .limit(500);

    const mapped = (data || []).map(mapHourlyRow);
    setAllHourly(mapped);
    return mapped;
  }, [user]);

  const loadFromCache = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    const { data: userCache } = await supabase
      .from("ml_user_cache")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (userCache) {
      setMlUser({
        id: userCache.ml_user_id,
        nickname: userCache.nickname,
        country: userCache.country,
        permalink: userCache.permalink,
      });
      setActiveListings(userCache.active_listings || 0);
    }

    const { data: dailyCache } = await supabase
      .from("ml_daily_cache")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1000);

    if (!dailyCache || dailyCache.length === 0) {
      setAllDaily([]);
      return !!userCache;
    }

    setAllDaily(dailyCache.map(mapDailyRow));
    setConnected(true);
    return true;
  }, [user]);

  const saveToCache = useCallback(async (
    dailyData: DailyBreakdown[],
    hourlyData: HourlyBreakdown[] = [],
    mlUserInfo?: MLUser | null,
    listings?: number,
  ) => {
    if (!user || dailyData.length === 0) return;

    try {
      const syncedAt = new Date().toISOString();
      const dailyRows = dailyData.map((d) => ({
        user_id: user.id,
        date: d.date,
        total_revenue: d.total,
        approved_revenue: d.approved,
        qty_orders: d.qty,
        cancelled_orders: d.cancelled || 0,
        shipped_orders: d.shipped || 0,
        unique_visits: d.unique_visits || 0,
        unique_buyers: d.unique_buyers || 0,
        synced_at: syncedAt,
      }));

      for (let i = 0; i < dailyRows.length; i += 200) {
        const batch = dailyRows.slice(i, i + 200);
        await supabase
          .from("ml_daily_cache")
          .upsert(batch, { onConflict: "user_id,date" });
      }

      if (hourlyData.length > 0) {
        const hourlyRows = hourlyData.map((h) => ({
          user_id: user.id,
          date: h.date,
          hour: h.hour,
          total_revenue: h.total,
          approved_revenue: h.approved,
          qty_orders: h.qty,
          synced_at: syncedAt,
        }));

        for (let i = 0; i < hourlyRows.length; i += 200) {
          const batch = hourlyRows.slice(i, i + 200);
          await (supabase as any)
            .from("ml_hourly_cache")
            .upsert(batch, { onConflict: "user_id,date,hour" });
        }
      }

      if (mlUserInfo) {
        await supabase
          .from("ml_user_cache")
          .upsert({
            user_id: user.id,
            ml_user_id: mlUserInfo.id,
            nickname: mlUserInfo.nickname,
            country: mlUserInfo.country,
            permalink: mlUserInfo.permalink,
            active_listings: listings || 0,
            synced_at: syncedAt,
          }, { onConflict: "user_id" });
      }
    } catch (err) {
      console.error("Frontend cache save error:", err);
    }
  }, [user]);

  const syncFromAPI = useCallback(async () => {
    if (!user) return;
    setSyncing(true);

    try {
      const { data: tokenRow } = await supabase
        .from("ml_tokens")
        .select("access_token, expires_at, refresh_token")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tokenRow?.access_token) {
        setConnected(false);
        return;
      }

      let accessToken = tokenRow.access_token;
      const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
      if (expiresAt > 0 && expiresAt - Date.now() < 5 * 60 * 1000 && tokenRow.refresh_token) {
        const { data: refreshed } = await supabase.functions.invoke("ml-token-refresh", {
          body: { refresh_token: tokenRow.refresh_token, user_id: user.id },
        });
        if (refreshed?.access_token) accessToken = refreshed.access_token;
      }

      setCachedAccessToken(accessToken);
      setConnected(true);

      const { data, error } = await supabase.functions.invoke("mercado-libre-integration", {
        body: { access_token: accessToken, days: 30, user_id: user.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");

      const userInfo: MLUser = data.user;
      const listings = data.metrics?.active_listings || 0;
      const dailyData: DailyBreakdown[] = (data.daily_breakdown || []).map(mapDailyRow);
      const hourlyData: HourlyBreakdown[] = (data.hourly_breakdown || []).map(mapHourlyRow);

      setMlUser(userInfo);
      setActiveListings(listings);
      setAllDaily(dailyData);
      setAllHourly(hourlyData);

      await saveToCache(dailyData, hourlyData, userInfo, listings);

      const now = new Date().toLocaleString("pt-BR");
      setLastSyncedAt(now);
      localStorage.setItem(LAST_ML_SYNC_KEY, now);
      toast({ title: "Sincronizado", description: "Dados atualizados com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }, [user, toast, saveToCache]);

  const reloadCache = useCallback(async () => {
    cacheLoadedRef.current = false;
    await Promise.all([loadFromCache(), loadHourlyCache()]);
  }, [loadFromCache, loadHourlyCache]);

  useEffect(() => {
    if (!user || cacheLoadedRef.current) return;
    cacheLoadedRef.current = true;

    (async () => {
      const { data: tokenRow } = await supabase
        .from("ml_tokens")
        .select("access_token")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tokenRow?.access_token) {
        setConnected(false);
        setLoading(false);
        return;
      }

      setCachedAccessToken(tokenRow.access_token);
      setConnected(true);
      await Promise.all([loadFromCache(), loadHourlyCache()]);
      setLoading(false);
    })();
  }, [user, loadFromCache, loadHourlyCache]);

  useEffect(() => {
    if (!user || !isHourlyAvailable) {
      setAllHourly((current) => (current.length > 0 && !isHourlyAvailable ? [] : current));
      return;
    }

    void loadHourlyCache();
  }, [user, isHourlyAvailable, period, loadHourlyCache]);

  if (!loading && !connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Plug className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold text-foreground">Mercado Livre não conectado</h2>
        <p className="text-muted-foreground text-sm">Conecte sua conta para visualizar os dashboards.</p>
        <Button asChild>
          <Link to="/integracoes">Ir para Integrações</Link>
        </Button>
      </div>
    );
  }

  const dailyChartData = [...daily].reverse().map((d) => ({
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    "Venda Total": d.total,
    "Venda Aprovada": d.approved,
    Pedidos: d.qty,
  }));

  const hourlyChartData = buildHourlyChartData(hourly);
  const showHourlyChart = isHourlyAvailable && chartMode === "hourly";
  const chartData = showHourlyChart ? hourlyChartData : dailyChartData;
  const hasData = allDaily.length > 0;
  const hasHourlyData = hourly.length > 0;
  const chartTitle = showHourlyChart ? `Venda por Hora — ${periodLabel}` : `Vendas Diárias — ${periodLabel}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mercado Livre</h1>
          <p className="text-sm text-muted-foreground">
            {mlUser ? `Vendedor: ${mlUser.nickname}` : "Vendas do Mercado Livre"}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {lastSyncedAt ? `Última sinc: ${lastSyncedAt}` : "Nunca sincronizado"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Popover open={popoverOpen} onOpenChange={(open) => {
            setPopoverOpen(open);
            if (open) setPendingRange(customRange);
          }}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                {periodLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="flex gap-1 mb-3">
                {QUICK_RANGES.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={!customRange && period === opt.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => {
                      setPeriod(opt.value);
                      setCustomRange(null);
                      setPendingRange(null);
                      setPopoverOpen(false);
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              <Calendar
                mode="range"
                selected={pendingRange ?? undefined}
                onSelect={(range) => {
                  if (!range?.from) {
                    setPendingRange(null);
                    return;
                  }
                  setPendingRange({
                    from: startOfDay(range.from),
                    to: range.to ? startOfDay(range.to) : undefined,
                  });
                }}
                disabled={(date) => date > new Date()}
                numberOfMonths={2}
                locale={ptBR}
                className="pointer-events-auto"
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    setCustomRange(null);
                    setPendingRange(null);
                    setPeriod(0);
                    setPopoverOpen(false);
                  }}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Limpar
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!pendingRange?.from || !pendingRange?.to}
                  onClick={() => {
                    if (pendingRange?.from && pendingRange?.to) {
                      setCustomRange(pendingRange);
                      setPopoverOpen(false);
                    }
                  }}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Confirmar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {mlUser?.permalink && (
            <Button variant="outline" size="sm" asChild>
              <a href={mlUser.permalink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" /> Perfil ML
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={syncFromAPI} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} /> Sincronizar
          </Button>
          <HistoricalSyncModal
            accessToken={cachedAccessToken}
            onSyncComplete={reloadCache}
            saveToCache={(dailyData, hourlyData) => saveToCache(dailyData, hourlyData)}
          />
        </div>
      </div>

      {!loading && connected && !hasData && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-6">
            <Info className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Nenhum dado no cache</p>
              <p className="text-xs text-muted-foreground">
                Clique em <strong>Sincronizar</strong> para carregar os dados pela primeira vez, ou use <strong>Histórico</strong> para importar meses anteriores.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Receita Total" value={metrics ? currencyFmt(metrics.total_revenue) : "—"} icon={<DollarSign className="w-5 h-5" />} variant="info" loading={loading} refreshing={syncing} subtitle={periodLabel} />
        <KPICard title="Receita Aprovada" value={metrics ? currencyFmt(metrics.approved_revenue) : "—"} icon={<TrendingUp className="w-5 h-5" />} variant="success" loading={loading} refreshing={syncing} subtitle={periodLabel} />
        <KPICard title="Total de Pedidos" value={metrics ? String(metrics.total_orders) : "—"} icon={<ShoppingCart className="w-5 h-5" />} variant="purple" loading={loading} refreshing={syncing} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Ticket Médio" value={metrics ? metrics.avg_ticket.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—"} icon={<Tag className="w-5 h-5" />} variant="orange" loading={loading} refreshing={syncing} />
        <KPICard title="Anúncios Ativos" value={String(activeListings)} icon={<Tag className="w-5 h-5" />} variant="neutral" loading={loading} refreshing={syncing} />
        <KPICard title="Pedidos Enviados" value={String(daily.reduce((s, d) => s + d.shipped, 0))} icon={<TrendingUp className="w-5 h-5" />} variant="success" loading={loading} refreshing={syncing} />
        <KPICard title="Pedidos Cancelados" value={String(daily.reduce((s, d) => s + d.cancelled, 0))} icon={<X className="w-5 h-5" />} variant="danger" loading={loading} refreshing={syncing} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Visitas Únicas" value={metrics ? metrics.unique_visits.toLocaleString("pt-BR") : "—"} icon={<Eye className="w-5 h-5" />} variant="neutral" loading={loading} refreshing={syncing} />
        <KPICard title="Total de Compradores" value={metrics ? metrics.unique_buyers.toLocaleString("pt-BR") : "—"} icon={<Users className="w-5 h-5" />} variant="success" loading={loading} refreshing={syncing} />
        <KPICard title="Conversão" value={metrics ? `${metrics.conversion_rate.toFixed(2)}%` : "—"} icon={<Percent className="w-5 h-5" />} variant="info" loading={loading} refreshing={syncing} />
      </div>

      {(dailyChartData.length > 0 || showHourlyChart) && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{chartTitle}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={chartMode === "daily" ? "default" : "outline"}
                onClick={() => setChartMode("daily")}
              >
                Diário
              </Button>
              {isHourlyAvailable && (
                <Button
                  size="sm"
                  variant={chartMode === "hourly" ? "default" : "outline"}
                  onClick={() => setChartMode("hourly")}
                >
                  <Clock3 className="mr-1 h-4 w-4" /> Venda / Hora
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {showHourlyChart && !hasHourlyData ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">Sem dados horários para este período</p>
                <p className="mt-1 text-xs text-muted-foreground">Sincronize novamente para carregar a visão de venda por hora de Hoje ou dos últimos 7 dias.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="mlTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mlApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    yAxisId="revenue"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  {showHourlyChart && (
                    <YAxis
                      yAxisId="orders"
                      orientation="right"
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                  )}
                  <RechartsTooltip
                    formatter={(value: number, name: string) => name === "Pedidos" ? [value, name] : [currencyFmt(Number(value)), name]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Legend />
                  {showHourlyChart ? (
                    <>
                      <Bar yAxisId="orders" dataKey="Pedidos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      <Area yAxisId="revenue" type="monotone" dataKey="Venda Total" stroke="hsl(var(--accent))" fill="url(#mlTotal)" strokeWidth={2.5} />
                      <Line yAxisId="revenue" type="monotone" dataKey="Venda Aprovada" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                    </>
                  ) : (
                    <>
                      <Area yAxisId="revenue" type="monotone" dataKey="Venda Total" stroke="hsl(var(--accent))" fill="url(#mlTotal)" strokeWidth={2.5} />
                      <Area yAxisId="revenue" type="monotone" dataKey="Venda Aprovada" stroke="hsl(var(--success))" fill="url(#mlApproved)" strokeWidth={2} />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {daily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento Diário</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Venda Total</TableHead>
                  <TableHead className="text-right">Venda Aprovada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daily.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell>{format(parseISO(d.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell className="text-right">{d.qty}</TableCell>
                    <TableCell className="text-right">{currencyFmt(d.total)}</TableCell>
                    <TableCell className="text-right">{currencyFmt(d.approved)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totals.qty}</TableCell>
                  <TableCell className="text-right">{currencyFmt(totals.total)}</TableCell>
                  <TableCell className="text-right">{currencyFmt(totals.approved)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
