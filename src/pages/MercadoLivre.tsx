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
  DollarSign, ShoppingCart, TrendingUp, Tag, Megaphone, PackageCheck, PackageX, RefreshCw, ExternalLink, Plug, CalendarIcon, Info, Check, X,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
}

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const QUICK_RANGES = [
  { label: "Hoje", value: 0 },
  { label: "7 dias", value: 7 },
  { label: "15 dias", value: 15 },
  { label: "30 dias", value: 30 },
] as const;

type DateRange = { from: Date; to?: Date } | null;

const LAST_ML_SYNC_KEY = "ml_last_synced_at";

/** Returns today's date string in yyyy-MM-dd using UTC to match ML API dates */
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

export default function MercadoLivre() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [mlUser, setMlUser] = useState<MLUser | null>(null);
  const [cachedAccessToken, setCachedAccessToken] = useState<string | null>(null);
  const [allDaily, setAllDaily] = useState<DailyBreakdown[]>([]);
  const [activeListings, setActiveListings] = useState(0);
  const [period, setPeriod] = useState(0); // 0 = today (default)
  const [customRange, setCustomRange] = useState<DateRange>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStorage.getItem(LAST_ML_SYNC_KEY));
  const cacheLoadedRef = useRef(false);

  // Filter daily data locally based on period or custom range (UTC-based)
  const daily = allDaily.filter((d) => {
    if (customRange?.from) {
      const from = format(startOfDay(customRange.from), "yyyy-MM-dd");
      const to = format(startOfDay(customRange.to ?? customRange.from), "yyyy-MM-dd");
      return d.date >= from && d.date <= to;
    }
    const cutoff = cutoffDateStr(period);
    return d.date >= cutoff;
  });

  const periodLabel = customRange?.from
    ? customRange.to
      ? `${format(customRange.from, "dd/MM/yy")} – ${format(customRange.to, "dd/MM/yy")}`
      : `Início: ${format(customRange.from, "dd/MM/yy")}`
    : period === 0 ? "Hoje" : `Últimos ${period} dias`;

  // Compute metrics from filtered daily data
  const metrics = daily.length > 0 ? {
    total_revenue: daily.reduce((s, d) => s + d.total, 0),
    approved_revenue: daily.reduce((s, d) => s + d.approved, 0),
    total_orders: daily.reduce((s, d) => s + d.qty, 0),
    cancelled_orders: daily.reduce((s, d) => s + (d.cancelled || 0), 0),
    shipped_orders: daily.reduce((s, d) => s + (d.shipped || 0), 0),
    active_listings: activeListings,
    avg_ticket: 0,
  } : null;

  if (metrics && metrics.total_orders > 0) {
    metrics.avg_ticket = metrics.total_revenue / metrics.total_orders;
  }

  // Totals for footer
  const totals = {
    qty: daily.reduce((s, d) => s + d.qty, 0),
    total: daily.reduce((s, d) => s + d.total, 0),
    approved: daily.reduce((s, d) => s + d.approved, 0),
  };

  const loadFromCache = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    // Load user cache (optional — don't block on it)
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

    if (!dailyCache || dailyCache.length === 0) return !!userCache;
    setAllDaily(dailyCache.map((r: any) => ({
      date: r.date,
      total: Number(r.total_revenue),
      approved: Number(r.approved_revenue),
      qty: r.qty_orders,
      cancelled: r.cancelled_orders || 0,
      shipped: r.shipped_orders || 0,
    })));
    setConnected(true);
    return true;
  }, [user]);

  /** Write daily breakdown + user info to cache from frontend (fallback for edge function) */
  const saveToCache = useCallback(async (
    dailyData: DailyBreakdown[],
    mlUserInfo?: MLUser | null,
    listings?: number,
  ) => {
    if (!user || dailyData.length === 0) return;
    try {
      const dailyRows = dailyData.map((d) => ({
        user_id: user.id,
        date: d.date,
        total_revenue: d.total,
        approved_revenue: d.approved,
        qty_orders: d.qty,
        cancelled_orders: d.cancelled || 0,
        shipped_orders: d.shipped || 0,
        synced_at: new Date().toISOString(),
      }));

      // Upsert in batches of 200
      for (let i = 0; i < dailyRows.length; i += 200) {
        const batch = dailyRows.slice(i, i + 200);
        await supabase
          .from("ml_daily_cache")
          .upsert(batch, { onConflict: "user_id,date" });
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
            synced_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
      }
      console.log(`Frontend cache saved: ${dailyRows.length} daily rows`);
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

      // Always fetch 30 days to populate full cache
      const { data, error } = await supabase.functions.invoke("mercado-libre-integration", {
        body: { access_token: accessToken, days: 30, user_id: user.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");

      const userInfo: MLUser = data.user;
      const listings = data.metrics?.active_listings || 0;
      const dailyData: DailyBreakdown[] = (data.daily_breakdown || []).map((d: any) => ({
        date: d.date,
        total: d.total,
        approved: d.approved,
        qty: d.qty,
        cancelled: d.cancelled || 0,
        shipped: d.shipped || 0,
      }));

      setMlUser(userInfo);
      setActiveListings(listings);
      setAllDaily(dailyData);

      // Save to cache from frontend (edge function cache may fail silently)
      await saveToCache(dailyData, userInfo, listings);

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

  // Reload cache after historical import
  const reloadCache = useCallback(async () => {
    cacheLoadedRef.current = false;
    await loadFromCache();
  }, [loadFromCache]);

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

      // Bug fix #3: populate cachedAccessToken from DB on load
      setCachedAccessToken(tokenRow.access_token);
      setConnected(true);
      await loadFromCache();
      setLoading(false);
    })();
  }, [user, loadFromCache]);

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

  const chartData = [...daily].reverse().map((d) => ({
    date: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    "Venda Total": d.total,
    "Venda Aprovada": d.approved,
    qty: d.qty,
  }));

  const hasData = allDaily.length > 0;

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
          <HistoricalSyncModal accessToken={cachedAccessToken} onSyncComplete={reloadCache} saveToCache={saveToCache} />
        </div>
      </div>

      {/* Empty state banner */}
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

      {/* KPIs - Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Receita Total" value={metrics ? currencyFmt(metrics.total_revenue) : "—"} icon={<DollarSign className="w-5 h-5" />} variant="info" loading={loading} refreshing={syncing} subtitle={periodLabel} />
        <KPICard title="Receita Aprovada" value={metrics ? currencyFmt(metrics.approved_revenue) : "—"} icon={<TrendingUp className="w-5 h-5" />} variant="success" loading={loading} refreshing={syncing} subtitle={periodLabel} />
        <KPICard title="Total de Pedidos" value={metrics ? String(metrics.total_orders) : "—"} icon={<ShoppingCart className="w-5 h-5" />} variant="purple" loading={loading} refreshing={syncing} />
      </div>

      {/* KPIs - Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Ticket Médio" value={metrics ? currencyFmt(metrics.avg_ticket) : "—"} icon={<Tag className="w-5 h-5" />} variant="orange" loading={loading} refreshing={syncing} />
        <KPICard title="Anúncios Ativos" value={metrics ? String(metrics.active_listings) : "—"} icon={<Megaphone className="w-5 h-5" />} variant="neutral" loading={loading} refreshing={syncing} />
        <KPICard title="Pedidos Enviados" value={metrics ? String(metrics.shipped_orders) : "—"} icon={<PackageCheck className="w-5 h-5" />} variant="success" loading={loading} refreshing={syncing} />
        <KPICard title="Pedidos Cancelados" value={metrics ? String(metrics.cancelled_orders) : "—"} icon={<PackageX className="w-5 h-5" />} variant="danger" loading={loading} refreshing={syncing} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas Diárias — {periodLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="mlTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217,70%,45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217,70%,45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mlApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142,70%,45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142,70%,45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(217,5%,45%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(217,5%,45%)" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(value: number) => currencyFmt(value)} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)" }} />
                <Legend />
                <Area type="monotone" dataKey="Venda Total" stroke="hsl(217,70%,45%)" fill="url(#mlTotal)" strokeWidth={2} />
                <Area type="monotone" dataKey="Venda Aprovada" stroke="hsl(142,70%,45%)" fill="url(#mlApproved)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
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
