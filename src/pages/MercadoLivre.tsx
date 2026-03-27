import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMLStore } from "@/contexts/MLStoreContext";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { KPICard } from "@/components/dashboard/KPICard";
import { getMarketplaceDailyData, getMarketplaceHourlyData, getMarketplaceProducts, getMarketplaceName, getAllMarketplaceMockDaily, getAllMarketplaceMockHourly, getAllMarketplaceMockProducts } from "@/data/marketplaceMockData";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HistoricalSyncModal } from "@/components/mercadolivre/HistoricalSyncModal";
import { TopSellingProducts, type ProductSalesRow } from "@/components/mercadolivre/TopSellingProducts";
import { HourlySalesTable } from "@/components/mercadolivre/HourlySalesTable";
import { MLStoreSelector } from "@/components/mercadolivre/MLStoreSelector";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Tag,
  Eye,
  Users,
  Percent,
  ExternalLink,
  Plug,
  CalendarIcon,
  Info,
  Check,
  X,
  Clock3,
  Loader2,
  Handshake,
  ShoppingBag,
  Store,
  Building2,
  ChevronDown,
  ChevronUp,
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
  units_sold: number;
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

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const QUICK_RANGES = [
  { label: "Hoje", value: 0 },
  { label: "7 dias", value: 7 },
  { label: "15 dias", value: 15 },
  { label: "30 dias", value: 30 },
] as const;

const LAST_ML_SYNC_KEY = "ml_last_synced_at";
const LAST_ML_SYNC_TS_KEY = "ml_last_synced_ts";
const AUTO_SYNC_STALE_MS = 10 * 60 * 1000;

function todayUTC() {
  return format(new Date(), "yyyy-MM-dd");
}

function cutoffDateStr(daysBack: number) {
  if (daysBack === 0) return todayUTC();
  const d = new Date();
  d.setDate(d.getDate() - daysBack + 1);
  return format(d, "yyyy-MM-dd");
}

function mapDailyRow(row: any): DailyBreakdown {
  return {
    date: row.date,
    total: Number(row.total_revenue ?? row.total ?? 0),
    approved: Number(row.approved_revenue ?? row.approved ?? 0),
    qty: Number(row.qty_orders ?? row.qty ?? 0),
    units_sold: Number(row.units_sold ?? row.qty_orders ?? row.qty ?? 0),
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

function getFilterDates(customRange: DateRange, period: number): { fromDate: string; toDate: string } {
  if (customRange?.from) {
    const fromDate = format(startOfDay(customRange.from), "yyyy-MM-dd");
    const toDate = customRange.to ? format(startOfDay(customRange.to), "yyyy-MM-dd") : fromDate;
    return { fromDate, toDate };
  }
  return { fromDate: cutoffDateStr(period), toDate: todayUTC() };
}

export default function MercadoLivre() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { stores, selectedStore, salesCache, setSalesCache } = useMLStore();
  const { selectedMarketplace, activeMarketplace } = useMarketplace();
  const isML = selectedMarketplace === "mercado-livre";
  const isAll = selectedMarketplace === "all";
  const useRealData = isML || isAll;
  const marketplaceName = activeMarketplace ? activeMarketplace.name : "Todos os Marketplaces";
  const [loading, setLoading] = useState(() => salesCache.daily.length === 0);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(() => salesCache.connected);
  const [mlUser, setMlUser] = useState<MLUser | null>(() => salesCache.mlUser);
  const [cachedAccessToken, setCachedAccessToken] = useState<string | null>(() => salesCache.accessToken);
  const [allDaily, setAllDaily] = useState<DailyBreakdown[]>(() => salesCache.daily);
  const [allHourly, setAllHourly] = useState<HourlyBreakdown[]>(() => salesCache.hourly);
  const [allProductSales, setAllProductSales] = useState<(ProductSalesRow & { date: string })[]>(() => salesCache.products as any);
  const [productStockMap, setProductStockMap] = useState<Record<string, number>>(() => salesCache.productStockMap);
  const [period, setPeriod] = useState(0);
  const [customRange, setCustomRange] = useState<DateRange>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("hourly");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange>(null);
  const [pendingPeriod, setPendingPeriod] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => salesCache.lastSyncedAt ?? localStorage.getItem(LAST_ML_SYNC_KEY));
  const cacheLoadedRef = useRef(salesCache.daily.length > 0);

  // Sync local state back to context on changes
  useEffect(() => {
    setSalesCache(() => ({
      daily: allDaily,
      hourly: allHourly,
      products: allProductSales,
      mlUser,
      connected,
      lastSyncedAt,
      accessToken: cachedAccessToken,
      productStockMap,
    }));
  }, [allDaily, allHourly, allProductSales, mlUser, connected, lastSyncedAt, cachedAccessToken, productStockMap, setSalesCache]);

  const singleDayRange =
    customRange?.from && customRange?.to
      ? format(startOfDay(customRange.from), "yyyy-MM-dd") === format(startOfDay(customRange.to), "yyyy-MM-dd")
        ? format(startOfDay(customRange.from), "yyyy-MM-dd")
        : null
      : null;

  const isHourlyAvailable = period === 0 || !!singleDayRange;
  const hourlyTargetDate = singleDayRange ?? (period === 0 ? todayUTC() : null);
  const activeFilterKey = customRange?.from
    ? `${format(startOfDay(customRange.from), "yyyy-MM-dd")}:${format(startOfDay(customRange.to ?? customRange.from), "yyyy-MM-dd")}`
    : `period:${period}`;

  useEffect(() => {
    setChartMode(isHourlyAvailable ? "hourly" : "daily");
  }, [activeFilterKey, isHourlyAvailable]);

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
    if (isHourlyAvailable) {
      if (singleDayRange) return d.date === singleDayRange;
      return d.date === todayUTC();
    }
    if (customRange?.from) {
      const from = format(startOfDay(customRange.from), "yyyy-MM-dd");
      const to = customRange.to ? format(startOfDay(customRange.to), "yyyy-MM-dd") : from;
      return d.date >= from && d.date <= to;
    }
    const cutoff = cutoffDateStr(period);
    return d.date >= cutoff;
  });

  const periodLabel = customRange?.from
    ? customRange.to && format(startOfDay(customRange.from), "yyyy-MM-dd") !== format(startOfDay(customRange.to), "yyyy-MM-dd")
      ? `${format(customRange.from, "dd/MM/yy")} – ${format(customRange.to, "dd/MM/yy")}`
      : format(customRange.from, "dd/MM/yy")
    : period === 0
      ? "Hoje"
      : `Últimos ${period} dias`;

  const pendingLabel = (() => {
    if (pendingRange?.from) {
      const from = format(pendingRange.from, "dd/MM/yyyy");
      const to = pendingRange.to ? format(pendingRange.to, "dd/MM/yyyy") : from;
      return from === to ? `${from} (1 dia)` : `${from} – ${to}`;
    }
    if (pendingPeriod !== null) return pendingPeriod === 0 ? "Hoje" : `Últimos ${pendingPeriod} dias`;
    return null;
  })();

  const canConfirm = pendingRange !== null || pendingPeriod !== null;

  const metrics =
    daily.length > 0
      ? {
          total_revenue: daily.reduce((s, d) => s + d.total, 0),
          approved_revenue: daily.reduce((s, d) => s + d.approved, 0),
          total_orders: daily.reduce((s, d) => s + d.qty, 0),
          units_sold: daily.reduce((s, d) => s + d.units_sold, 0),
          unique_visits: daily.reduce((s, d) => s + (d.unique_visits || 0), 0),
          unique_buyers: daily.reduce((s, d) => s + (d.unique_buyers || 0), 0),
          avg_ticket: 0,
          conversion_rate: 0,
        }
      : null;

  if (metrics) {
    if (metrics.total_orders > 0) metrics.avg_ticket = metrics.total_revenue / metrics.total_orders;
    if (metrics.unique_visits > 0) metrics.conversion_rate = (metrics.unique_buyers / metrics.unique_visits) * 100;
  }

  // Produtos já vêm filtrados pelo período — só agrega por item_id
  const filteredTopProducts = (() => {
    const agg: Record<string, ProductSalesRow> = {};
    for (const p of allProductSales) {
      if (!agg[p.item_id]) {
        agg[p.item_id] = { item_id: p.item_id, title: p.title, thumbnail: p.thumbnail, qty_sold: 0, revenue: 0 };
      }
      agg[p.item_id].qty_sold += p.qty_sold;
      agg[p.item_id].revenue += p.revenue;
    }
    return Object.values(agg)
      .map((p) => ({ ...p, available_quantity: productStockMap[p.item_id] }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  })();

  // Carrega produtos filtrados pelo período exato
  const loadProductCache = useCallback(
    async (fromDate: string, toDate: string) => {
      if (!user) {
        setAllProductSales([]);
        return;
      }
      let query = (supabase as any)
        .from("ml_product_daily_cache")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("revenue", { ascending: false })
        .limit(5000);
      if (selectedStore !== "all") {
        query = query.eq("ml_user_id", selectedStore);
      }
      const { data } = await query;
      setAllProductSales(
        (data || []).map((r: any) => ({
          item_id: r.item_id,
          date: r.date,
          title: r.title || "",
          thumbnail: r.thumbnail,
          qty_sold: Number(r.qty_sold || 0),
          revenue: Number(r.revenue || 0),
        })),
      );
    },
    [user, selectedStore],
  );

  const loadHourlyCache = useCallback(
    async (overrideDate?: string | null) => {
      if (!user) {
        setAllHourly([]);
        return [] as HourlyBreakdown[];
      }

      let query = (supabase as any)
        .from("ml_hourly_cache")
        .select("*")
        .eq("user_id", user.id);
      if (selectedStore !== "all") {
        query = query.eq("ml_user_id", selectedStore);
      }
      query = query
        .order("date", { ascending: false })
        .order("hour", { ascending: true });

      const dateToFilter = overrideDate !== undefined ? overrideDate : hourlyTargetDate;
      const filterByDate = overrideDate !== undefined ? !!overrideDate : isHourlyAvailable && !!hourlyTargetDate;

      if (filterByDate && dateToFilter) {
        query = query.eq("date", dateToFilter).limit(24);
      } else {
        query = query.limit(1000);
      }

      const { data } = await query;
      const mapped = (data || []).map(mapHourlyRow);
      setAllHourly(mapped);
      return mapped;
    },
    [user, isHourlyAvailable, hourlyTargetDate, selectedStore],
  );

  const loadFromCache = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    let userCacheQuery = supabase.from("ml_user_cache").select("*").eq("user_id", user.id);
    if (selectedStore !== "all") {
      userCacheQuery = userCacheQuery.eq("ml_user_id", Number(selectedStore));
    }

    let dailyCacheQuery = supabase
      .from("ml_daily_cache")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1000);
    if (selectedStore !== "all") {
      dailyCacheQuery = dailyCacheQuery.eq("ml_user_id", selectedStore);
    }

    const [{ data: userCacheData }, { data: dailyCache }] = await Promise.all([
      userCacheQuery.maybeSingle(),
      dailyCacheQuery,
    ]);

    if (userCacheData) {
      setMlUser({
        id: userCacheData.ml_user_id,
        nickname: userCacheData.nickname,
        country: userCacheData.country,
        permalink: userCacheData.permalink,
      });
    }

    if (!dailyCache || dailyCache.length === 0) {
      setAllDaily([]);
      return !!userCacheData;
    }

    setAllDaily(dailyCache.map(mapDailyRow));
    setConnected(true);
    return true;
  }, [user, selectedStore]);

  const saveToCache = useCallback(
    async (
      dailyData: DailyBreakdown[],
      hourlyData: HourlyBreakdown[] = [],
      mlUserInfo?: MLUser | null,
      listings?: number,
    ) => {
      if (!user || dailyData.length === 0) return;
      try {
        const syncedAt = new Date().toISOString();
        const mlId = selectedStore !== "all" ? selectedStore : (mlUserInfo ? String(mlUserInfo.id) : "");
        const dailyRows = dailyData.map((d) => ({
          user_id: user.id,
          ml_user_id: mlId,
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
          await supabase.from("ml_daily_cache").upsert(dailyRows.slice(i, i + 200), { onConflict: "user_id,ml_user_id,date" });
        }

        if (hourlyData.length > 0) {
          const hourlyRows = hourlyData.map((h) => ({
            user_id: user.id,
            ml_user_id: mlId,
            date: h.date,
            hour: h.hour,
            total_revenue: h.total,
            approved_revenue: h.approved,
            qty_orders: h.qty,
            synced_at: syncedAt,
          }));
          for (let i = 0; i < hourlyRows.length; i += 200) {
            await (supabase as any)
              .from("ml_hourly_cache")
              .upsert(hourlyRows.slice(i, i + 200), { onConflict: "user_id,ml_user_id,date,hour" });
          }
        }

        if (mlUserInfo) {
          await supabase.from("ml_user_cache").upsert(
            {
              user_id: user.id,
              ml_user_id: mlUserInfo.id,
              nickname: mlUserInfo.nickname,
              country: mlUserInfo.country,
              permalink: mlUserInfo.permalink,
              active_listings: listings || 0,
              synced_at: syncedAt,
            },
            { onConflict: "user_id,ml_user_id" },
          );
        }
      } catch (err) {
        console.error("Frontend cache save error:", err);
      }
    },
    [user],
  );

  const syncFromAPI = useCallback(
    async (opts?: { from?: Date; to?: Date; periodDays?: number }) => {
      if (!user) return;
      setSyncing(true);

      try {
        // Determine which tokens to sync
        let tokensToSync: { access_token: string; ml_user_id: string }[] = [];

        if (selectedStore === "all") {
          // Sync all stores
          const { data: allTokens } = await supabase
            .from("ml_tokens")
            .select("access_token, ml_user_id, expires_at, refresh_token")
            .eq("user_id", user.id)
            .not("access_token", "is", null);
          tokensToSync = (allTokens || [])
            .filter((t) => t.access_token && t.ml_user_id)
            .map((t) => ({ access_token: t.access_token!, ml_user_id: t.ml_user_id! }));
        } else {
          // Sync specific store
          const { data: tokenRow } = await supabase
            .from("ml_tokens")
            .select("access_token, expires_at, refresh_token, ml_user_id")
            .eq("user_id", user.id)
            .eq("ml_user_id", selectedStore)
            .maybeSingle();
          if (tokenRow?.access_token) {
            tokensToSync = [{ access_token: tokenRow.access_token, ml_user_id: tokenRow.ml_user_id! }];
          }
        }

        if (tokensToSync.length === 0) {
          setConnected(false);
          return;
        }

        setCachedAccessToken(tokensToSync[0].access_token);
        setConnected(true);

        const today = startOfDay(new Date());
        let rangeStart = new Date(today);
        let rangeEnd = new Date(today);

        const effectiveFrom = opts?.from ?? customRange?.from;
        const effectiveTo = opts?.to ?? customRange?.to ?? customRange?.from;

        if (effectiveFrom) {
          rangeStart = startOfDay(effectiveFrom);
          rangeEnd = startOfDay(effectiveTo ?? effectiveFrom);
        } else {
          const days = opts?.periodDays ?? (period > 0 ? period : 1);
          rangeStart = new Date(today);
          rangeStart.setDate(today.getDate() - days + 1);
        }

        const fromDateStr = rangeStart.toISOString().substring(0, 10);
        const toDateStr = rangeEnd.toISOString().substring(0, 10);

        // Sync each token sequentially
        let lastUserInfo: MLUser | null = null;
        for (const tokenInfo of tokensToSync) {
          const { data: syncData, error: syncError } = await supabase.functions.invoke(
            "mercado-libre-integration",
            {
              body: {
                access_token: tokenInfo.access_token,
                user_id: user.id,
                date_from: fromDateStr,
                date_to: toDateStr,
              },
            },
          );

          if (syncError) throw syncError;
          if (!syncData?.success) throw new Error(syncData?.error || "Sync failed");
          if (syncData.user) lastUserInfo = syncData.user;
        }

        let hourlyDateOverride: string | null;
        if (effectiveFrom) {
          hourlyDateOverride = fromDateStr === toDateStr ? fromDateStr : null;
        } else {
          const days = opts?.periodDays ?? (period > 0 ? period : 1);
          hourlyDateOverride = days <= 1 ? todayUTC() : null;
        }

        await Promise.all([
          loadFromCache(),
          loadHourlyCache(hourlyDateOverride),
          loadProductCache(fromDateStr, toDateStr),
        ]);
        if (lastUserInfo) setMlUser(lastUserInfo);

        const now = new Date().toISOString();
        setLastSyncedAt(now);
        localStorage.setItem(LAST_ML_SYNC_KEY, now);
        localStorage.setItem(LAST_ML_SYNC_TS_KEY, String(Date.now()));
        toast({ title: "Sincronizado", description: `Dados atualizados: ${fromDateStr} → ${toDateStr}.` });
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      } finally {
        setSyncing(false);
      }
    },
    [user, toast, period, customRange, selectedStore, stores, loadFromCache, loadHourlyCache, loadProductCache],
  );

  const reloadCache = useCallback(async () => {
    cacheLoadedRef.current = false;
    const { fromDate, toDate } = getFilterDates(customRange, period);
    await Promise.all([loadFromCache(), loadHourlyCache(), loadProductCache(fromDate, toDate)]);
  }, [loadFromCache, loadHourlyCache, loadProductCache, customRange, period]);

  const autoSyncTriggeredRef = useRef(false);

  useEffect(() => {
    if (!user || cacheLoadedRef.current) return;
    cacheLoadedRef.current = true;

    (async () => {
      // Check for any token
      const { data: tokenRows } = await supabase
        .from("ml_tokens")
        .select("access_token, ml_user_id")
        .eq("user_id", user.id)
        .not("access_token", "is", null)
        .limit(10);

      if (!tokenRows || tokenRows.length === 0) {
        setConnected(false);
        setLoading(false);
        return;
      }

      // Use the first available token (or the selected one)
      const targetToken = selectedStore !== "all"
        ? tokenRows.find((t) => t.ml_user_id === selectedStore) || tokenRows[0]
        : tokenRows[0];

      setCachedAccessToken(targetToken.access_token!);
      setConnected(true);

      const { fromDate, toDate } = getFilterDates(customRange, period);
      await Promise.all([loadFromCache(), loadHourlyCache(), loadProductCache(fromDate, toDate)]);

      supabase.functions
        .invoke("ml-inventory", { body: { access_token: targetToken.access_token } })
        .then(({ data: invData }) => {
          if (invData?.items) {
            const stockMap: Record<string, number> = {};
            for (const item of invData.items) stockMap[item.id] = item.available_quantity ?? 0;
            setProductStockMap(stockMap);
          }
        })
        .catch(() => {});

      setLoading(false);

      if (!autoSyncTriggeredRef.current) {
        autoSyncTriggeredRef.current = true;
        const lastTs = Number(localStorage.getItem(LAST_ML_SYNC_TS_KEY) ?? 0);
        if (Date.now() - lastTs > AUTO_SYNC_STALE_MS) {
          syncFromAPI();
        }
      }
    })();
  }, [user, loadFromCache, loadHourlyCache, loadProductCache, syncFromAPI, selectedStore]);

  // Reload caches when store selection changes
  useEffect(() => {
    if (!user || !cacheLoadedRef.current) return;
    const { fromDate, toDate } = getFilterDates(customRange, period);
    void loadFromCache();
    void loadHourlyCache();
    void loadProductCache(fromDate, toDate);
  }, [selectedStore]);

  // Recarrega horário E produtos sempre que o filtro mudar
  useEffect(() => {
    if (!user) {
      setAllHourly([]);
      return;
    }
    const { fromDate, toDate } = getFilterDates(customRange, period);
    void loadHourlyCache();
    void loadProductCache(fromDate, toDate);
  }, [user, loadHourlyCache, loadProductCache, activeFilterKey]);

  const handleConfirm = useCallback(() => {
    if (pendingRange?.from) {
      const resolvedTo = pendingRange.to ?? pendingRange.from;
      const resolvedRange = { from: pendingRange.from, to: resolvedTo };
      setCustomRange(resolvedRange);
      setPeriod(0);
      setPopoverOpen(false);
      syncFromAPI({ from: resolvedRange.from, to: resolvedRange.to });
    } else if (pendingPeriod !== null) {
      setCustomRange(null);
      setPeriod(pendingPeriod);
      setPopoverOpen(false);
      syncFromAPI({ periodDays: pendingPeriod === 0 ? 1 : pendingPeriod });
    }
  }, [pendingRange, pendingPeriod, syncFromAPI]);

  // --- Mock data for non-ML marketplaces ---
  // Mock data for non-ML or aggregated mode
  const mockDaily = useMemo(() => {
    if (isAll) return getAllMarketplaceMockDaily(30);
    if (!useRealData) return getMarketplaceDailyData(selectedMarketplace, 30);
    return [];
  }, [isAll, useRealData, selectedMarketplace]);

  const mockHourly = useMemo(() => {
    if (isAll) return getAllMarketplaceMockHourly();
    if (!useRealData) return getMarketplaceHourlyData(selectedMarketplace);
    return [];
  }, [isAll, useRealData, selectedMarketplace]);

  const mockProducts = useMemo(() => {
    if (isAll) return getAllMarketplaceMockProducts();
    if (!useRealData) return getMarketplaceProducts(selectedMarketplace);
    return [];
  }, [isAll, useRealData, selectedMarketplace]);

  // Merge real ML data with mock data when "all"
  const effectiveDaily = useMemo(() => {
    if (isAll) {
      // Merge real daily + mock daily by date
      const dateMap = new Map<string, DailyBreakdown>();
      for (const d of daily) dateMap.set(d.date, { ...d });
      for (const d of mockDaily) {
        const existing = dateMap.get(d.date);
        if (existing) {
          existing.total += d.total;
          existing.approved += d.approved;
          existing.qty += d.qty;
          existing.units_sold += d.units_sold;
          existing.cancelled += d.cancelled;
          existing.shipped += d.shipped;
          existing.unique_visits += d.unique_visits;
          existing.unique_buyers += d.unique_buyers;
        } else {
          dateMap.set(d.date, { ...d });
        }
      }
      return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
    if (isML) return daily;
    return mockDaily;
  }, [isAll, isML, daily, mockDaily]);

  const effectiveHourly = useMemo(() => {
    if (isAll) {
      const hourMap = new Map<number, HourlyBreakdown>();
      for (const h of hourly) hourMap.set(h.hour, { ...h });
      for (const h of mockHourly) {
        const existing = hourMap.get(h.hour);
        if (existing) {
          existing.total += h.total;
          existing.approved += h.approved;
          existing.qty += h.qty;
        } else {
          hourMap.set(h.hour, { ...h });
        }
      }
      return Array.from(hourMap.values()).sort((a, b) => a.hour - b.hour);
    }
    if (isML) return hourly;
    return mockHourly;
  }, [isAll, isML, hourly, mockHourly]);

  const effectiveProducts = useMemo(() => {
    if (isAll) {
      const mlTagged = filteredTopProducts.map(p => ({ ...p, _marketplace: "mercado-livre" }));
      const mockTagged = mockProducts.map(p => {
        const prefix = p.item_id?.substring(0, 3)?.toLowerCase();
        const mp = prefix === "ama" ? "amazon" : prefix === "sho" ? "shopee" : prefix === "mag" ? "magalu" : "other";
        return { ...p, _marketplace: mp };
      });
      return [...mlTagged, ...mockTagged].sort((a, b) => b.revenue - a.revenue).slice(0, 15);
    }
    if (isML) return filteredTopProducts;
    return mockProducts;
  }, [isAll, isML, filteredTopProducts, mockProducts]);

  const effectiveMetrics = useMemo(() => {
    if (effectiveDaily.length === 0) return null;
    const m = {
      total_revenue: effectiveDaily.reduce((s, d) => s + d.total, 0),
      approved_revenue: effectiveDaily.reduce((s, d) => s + d.approved, 0),
      total_orders: effectiveDaily.reduce((s, d) => s + d.qty, 0),
      units_sold: effectiveDaily.reduce((s, d) => s + d.units_sold, 0),
      unique_visits: effectiveDaily.reduce((s, d) => s + (d.unique_visits || 0), 0),
      unique_buyers: effectiveDaily.reduce((s, d) => s + (d.unique_buyers || 0), 0),
      avg_ticket: 0,
      conversion_rate: 0,
    };
    if (m.total_orders > 0) m.avg_ticket = m.total_revenue / m.total_orders;
    if (m.unique_visits > 0) m.conversion_rate = (m.unique_buyers / m.unique_visits) * 100;
    return m;
  }, [effectiveDaily]);

  // Per-marketplace hourly data for "Todos" grid view
  const perMarketplaceHourly = useMemo(() => {
    if (!isAll) return null;
    const mpList = [
      { id: "mercado-livre", name: "Mercado Livre", data: hourly, icon: <Handshake className="w-4 h-4 text-amber-500" /> },
      { id: "amazon", name: "Amazon", data: getMarketplaceHourlyData("amazon"), icon: <ShoppingBag className="w-4 h-4 text-orange-500" /> },
      { id: "shopee", name: "Shopee", data: getMarketplaceHourlyData("shopee"), icon: <Store className="w-4 h-4 text-red-500" /> },
      { id: "magalu", name: "Magalu", data: getMarketplaceHourlyData("magalu"), icon: <Building2 className="w-4 h-4 text-blue-500" /> },
    ];
    return mpList.map((mp) => ({
      ...mp,
      chartData: buildHourlyChartData(mp.data),
    }));
  }, [isAll, hourly]);

  if (isML && !loading && !connected) {
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

  const effectiveLoading = useRealData ? loading : false;
  const effectiveSyncing = useRealData ? syncing : false;

  const dailyChartData = [...effectiveDaily].reverse().map((d) => ({
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    "Venda Total": d.total,
    "Venda Aprovada": d.approved,
    Pedidos: d.qty,
  }));

  const hourlyChartData = buildHourlyChartData(effectiveHourly);
  const showHourlyChart = (useRealData ? isHourlyAvailable : true) && chartMode === "hourly";
  const chartData = showHourlyChart ? hourlyChartData : dailyChartData;
  const hasData = useRealData ? allDaily.length > 0 || effectiveDaily.length > 0 : effectiveDaily.length > 0;
  const hasHourlyData = effectiveHourly.length > 0;
  const chartTitle = showHourlyChart ? `Venda / Hora — ${periodLabel}` : `Vendas Diárias — ${periodLabel}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <MLPageHeader title="Vendas" lastUpdated={useRealData && lastSyncedAt ? new Date(lastSyncedAt) : null} />
        </div>
        <div className="hidden md:flex flex-shrink-0 justify-center">
          <div className="w-72">
            <KPICard
              title="Receita Total"
              value={effectiveMetrics ? currencyFmt(effectiveMetrics.total_revenue) : "—"}
              variant="default"
              size="compact"
              loading={effectiveLoading}
              refreshing={effectiveSyncing}
              subtitle={periodLabel}
              className="text-center [&_div]:justify-center [&_span]:justify-center [&_p]:text-center [&>div]:py-1.5 bg-gradient-to-br from-[hsl(217,70%,45%)]/10 via-[hsl(217,70%,45%)]/5 to-transparent shadow-[0_0_12px_hsl(217,70%,45%,0.12)] border-[hsl(217,70%,45%)]/15 [&_p]:text-2xl [&_p]:font-bold"
            />
          </div>
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-end gap-2 flex-wrap">
          {isML && <MLStoreSelector />}
          <Popover
            open={popoverOpen}
            onOpenChange={(open) => {
              setPopoverOpen(open);
              if (open) {
                setPendingRange(customRange);
                setPendingPeriod(customRange ? null : period);
              } else {
                setPendingRange(null);
                setPendingPeriod(null);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-sm">
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                {periodLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              {/* Atalhos — apenas marcam seleção pendente, sem fechar */}
              <div className="flex gap-1 mb-3">
                {QUICK_RANGES.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={pendingPeriod === opt.value && pendingRange === null ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => {
                      setPendingPeriod(opt.value);
                      setPendingRange(null);
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              {/* Calendário — 1 clique = 1 dia, 2 cliques = range */}
              <Calendar
                mode="range"
                selected={pendingRange ?? undefined}
                onSelect={(range) => {
                  if (!range?.from) { setPendingRange(null); return; }
                  const from = startOfDay(range.from);
                  const to = range.to ? startOfDay(range.to) : from;
                  setPendingRange({ from, to });
                  setPendingPeriod(null);
                }}
                disabled={(date) => date > new Date()}
                numberOfMonths={2}
                locale={ptBR}
                className="pointer-events-auto"
              />
              {/* Pré-visualização */}
              {pendingLabel && (
                <p className="text-xs text-center text-muted-foreground mt-2 mb-1">{pendingLabel}</p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    setPendingRange(null);
                    setPendingPeriod(0);
                  }}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Limpar
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!canConfirm}
                  onClick={handleConfirm}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Confirmar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {isML && (
            <HistoricalSyncModal
              accessToken={cachedAccessToken}
              onSyncComplete={reloadCache}
              saveToCache={(dailyData, hourlyData) => saveToCache(dailyData, hourlyData)}
            />
          )}
        </div>
      </div>

      {isML && !effectiveLoading && connected && !hasData && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-6">
            <Info className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Nenhum dado no cache</p>
              <p className="text-xs text-muted-foreground">
                Clique em <strong>Sincronizar</strong> para carregar os dados pela primeira vez, ou use{" "}
                <strong>Histórico</strong> para importar meses anteriores.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receita Total visível apenas em mobile (em desktop fica no header) */}
      <div className="md:hidden">
        <KPICard
          title="Receita Total"
          value={effectiveMetrics ? currencyFmt(effectiveMetrics.total_revenue) : "—"}
          icon={<DollarSign className="w-5 h-5" />}
          variant="default"
          className="bg-gradient-to-br from-[hsl(217,70%,45%)]/10 via-[hsl(217,70%,45%)]/5 to-transparent shadow-[0_0_12px_hsl(217,70%,45%,0.12)] border-[hsl(217,70%,45%)]/15 [&_p]:text-2xl [&_p]:font-bold"
          loading={effectiveLoading}
          refreshing={effectiveSyncing}
          subtitle={periodLabel}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        <KPICard
          title="Receita Aprovada"
          value={effectiveMetrics ? currencyFmt(effectiveMetrics.approved_revenue) : "—"}
          icon={<DollarSign className="w-4 h-4" />}
          variant="success"
          size="compact"
          loading={effectiveLoading}
          refreshing={effectiveSyncing}
        />
        <KPICard
          title="Qtd. Vendas"
          value={effectiveMetrics ? String(effectiveMetrics.units_sold) : "—"}
          icon={<ShoppingCart className="w-4 h-4" />}
          variant="purple"
          size="compact"
          loading={effectiveLoading}
          refreshing={effectiveSyncing}
          tooltip="Nas vendas do carrinho, cada produto diferente conta como uma nova venda."
        />
        <KPICard
          title="Ticket Médio"
          value={
            effectiveMetrics
              ? effectiveMetrics.avg_ticket.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
              : "—"
          }
          icon={<Tag className="w-4 h-4" />}
          variant="orange"
          size="compact"
          loading={effectiveLoading}
          refreshing={effectiveSyncing}
        />
        <KPICard
          title="Visitas Únicas"
          value={effectiveMetrics ? effectiveMetrics.unique_visits.toLocaleString("pt-BR") : "—"}
          icon={<Eye className="w-4 h-4" />}
          variant="default"
          size="compact"
          loading={effectiveLoading}
          refreshing={effectiveSyncing}
        />
        <KPICard
          title="Compradores"
          value={effectiveMetrics ? effectiveMetrics.unique_buyers.toLocaleString("pt-BR") : "—"}
          icon={<Users className="w-4 h-4" />}
          variant="default"
          size="compact"
          loading={effectiveLoading}
          refreshing={effectiveSyncing}
        />
        <KPICard
          title="Conversão"
          value={effectiveMetrics ? `${effectiveMetrics.conversion_rate.toFixed(2)}%` : "—"}
          icon={<Percent className="w-4 h-4" />}
          variant="success"
          size="compact"
          loading={effectiveLoading}
          refreshing={effectiveSyncing}
        />
      </div>

      {/* === Hourly Charts === */}
      {isAll && perMarketplaceHourly ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {perMarketplaceHourly.map((mp) => (
            <Card key={mp.id}>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    {mp.icon}
                    Venda / Hora — {mp.name}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={mp.chartData}>
                    <defs>
                      <linearGradient id={`total-${mp.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="revenue" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="orders" orientation="right" allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => name === "Pedidos" ? [value, name] : [currencyFmt(Number(value)), name]}
                      contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }}
                    />
                    <Bar yAxisId="orders" dataKey="Pedidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Area yAxisId="revenue" type="monotone" dataKey="Venda Total" stroke="hsl(var(--accent))" fill={`url(#total-${mp.id})`} strokeWidth={2} />
                    <Line yAxisId="revenue" type="monotone" dataKey="Venda Aprovada" stroke="hsl(var(--success))" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (dailyChartData.length > 0 || showHourlyChart) ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{chartTitle}</CardTitle>
            <div className="flex items-center gap-2">
              {isHourlyAvailable && (
                <Button
                  size="sm"
                  variant={chartMode === "hourly" ? "default" : "outline"}
                  onClick={() => setChartMode("hourly")}
                >
                  <Clock3 className="mr-1 h-4 w-4" /> Venda / Hora
                </Button>
              )}
              {!isHourlyAvailable && (
                <Button
                  size="sm"
                  variant={chartMode === "daily" ? "default" : "outline"}
                  onClick={() => setChartMode("daily")}
                >
                  Diário
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {showHourlyChart && !hasHourlyData && !syncing ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">Sem dados horários para este período</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sincronize novamente para carregar a visão de venda / hora de Hoje ou dos últimos 7 dias.
                </p>
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
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--muted-foreground))"
                  />
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
                    formatter={(value: number, name: string) =>
                      name === "Pedidos" ? [value, name] : [currencyFmt(Number(value)), name]
                    }
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
                      <Bar
                        yAxisId="orders"
                        dataKey="Pedidos"
                        fill="hsl(var(--primary))"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                      <Area
                        yAxisId="revenue"
                        type="monotone"
                        dataKey="Venda Total"
                        stroke="hsl(var(--accent))"
                        fill="url(#mlTotal)"
                        strokeWidth={2.5}
                      />
                      <Line
                        yAxisId="revenue"
                        type="monotone"
                        dataKey="Venda Aprovada"
                        stroke="hsl(var(--success))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
                  ) : (
                    <>
                      <Area
                        yAxisId="revenue"
                        type="monotone"
                        dataKey="Venda Total"
                        stroke="hsl(var(--accent))"
                        fill="url(#mlTotal)"
                        strokeWidth={2.5}
                      />
                      <Area
                        yAxisId="revenue"
                        type="monotone"
                        dataKey="Venda Aprovada"
                        stroke="hsl(var(--success))"
                        fill="url(#mlApproved)"
                        strokeWidth={2}
                      />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* === Hourly Tables === */}
      {isAll && perMarketplaceHourly ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {perMarketplaceHourly.map((mp) => (
              <HourlySalesTable key={mp.id} hourly={mp.data} title={`Venda / Hora — ${mp.name}`} titleIcon={mp.icon} compact />
            ))}
          </div>
          <TopSellingProducts products={effectiveProducts} loading={effectiveLoading} showOrigin={isAll} />
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {(useRealData ? isHourlyAvailable : true) &&
            (effectiveSyncing && effectiveHourly.length === 0 ? (
              <Card className="flex flex-col h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Venda / Hora</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <p className="text-xs">Carregando dados horários...</p>
                  </div>
                </CardContent>
              </Card>
            ) : effectiveHourly.length > 0 ? (
              <HourlySalesTable hourly={effectiveHourly} />
            ) : null)}
          <TopSellingProducts products={effectiveProducts} loading={effectiveLoading} showOrigin={isAll} />
        </div>
      )}
    </div>
  );
}
