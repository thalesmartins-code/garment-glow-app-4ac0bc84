import { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getMarketplaceBrand } from "@/config/marketplaceConfig";
import { useMLStore } from "@/contexts/MLStoreContext";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { useSeller } from "@/contexts/SellerContext";
import { KPICard } from "@/components/dashboard/KPICard";
import { getMarketplaceDailyData, getMarketplaceHourlyData, getMarketplaceProducts, getMarketplaceName, getAllMarketplaceMockDaily, getAllMarketplaceMockHourly, getAllMarketplaceMockProducts } from "@/data/marketplaceMockData";
import { aggregateStoreDailyData, aggregateStoreHourlyData, aggregateStoreProducts, getStoreDailyData, type StoreRef } from "@/data/storeMockData";
import { SELLER_TO_MP_ID } from "@/config/marketplaceConfig";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HistoricalSyncModal } from "@/components/mercadolivre/HistoricalSyncModal";
import { TopSellingProducts, type ProductSalesRow } from "@/components/mercadolivre/TopSellingProducts";

import { RevenueByMarketplace, type MarketplaceRevenueGroup } from "@/components/mercadolivre/RevenueByMarketplace";
import { MLStoreSelector } from "@/components/mercadolivre/MLStoreSelector";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { GoalsCard } from "@/components/mercadolivre/GoalsCard";
import { useMLAds } from "@/hooks/useMLAds";
import { computeAdsSummary } from "@/data/adsMockData";
import { useMLReputation } from "@/hooks/useMLReputation";


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
  ChevronDown,
  Megaphone,
  Truck,
  Package,
} from "lucide-react";
import {
  ComposedChart,
  Area,
  AreaChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { format, parseISO, startOfDay, subDays, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MLRelatorios from "./mercadolivre/MLRelatorios";

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
const SYNC_CHUNK_DAYS = 1;

function todayUTC() {
  return format(new Date(), "yyyy-MM-dd");
}

function cutoffDateStr(daysBack: number) {
  if (daysBack === 0) return todayUTC();
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
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
    "Receita Total": 0,
    Pedidos: 0,
  }));
  hourlyRows.forEach((row) => {
    const bucket = buckets[row.hour];
    if (!bucket) return;
    bucket["Receita Total"] += row.total;
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

function getComparisonRanges(customRange: DateRange, period: number) {
  if (customRange?.from) {
    const from = format(startOfDay(customRange.from), "yyyy-MM-dd");
    const to = format(startOfDay(customRange.to ?? customRange.from), "yyyy-MM-dd");
    const diffMs = startOfDay(customRange.to ?? customRange.from).getTime() - startOfDay(customRange.from).getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const pTo = new Date(startOfDay(customRange.from));
    pTo.setDate(pTo.getDate() - 1);
    const pFrom = new Date(pTo);
    pFrom.setDate(pFrom.getDate() - diffDays + 1);
    return {
      currentFrom: from,
      currentTo: to,
      prevFrom: format(pFrom, "yyyy-MM-dd"),
      prevTo: format(pTo, "yyyy-MM-dd"),
      fetchFrom: format(pFrom, "yyyy-MM-dd"),
      fetchTo: to,
    };
  }

  const today = todayUTC();
  if (period === 0) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = format(yesterday, "yyyy-MM-dd");
    return {
      currentFrom: today,
      currentTo: today,
      prevFrom: yesterdayStr,
      prevTo: yesterdayStr,
      fetchFrom: yesterdayStr,
      fetchTo: today,
    };
  }

  const currentFrom = cutoffDateStr(period);
  const prevCutoffTo = new Date();
  prevCutoffTo.setDate(prevCutoffTo.getDate() - period - 1);
  const prevCutoffFrom = new Date();
  prevCutoffFrom.setDate(prevCutoffFrom.getDate() - period * 2 - 1);
  const prevFrom = format(prevCutoffFrom, "yyyy-MM-dd");
  const prevTo = format(prevCutoffTo, "yyyy-MM-dd");

  return {
    currentFrom,
    currentTo: today,
    prevFrom,
    prevTo,
    fetchFrom: prevFrom,
    fetchTo: today,
  };
}

export default function MercadoLivre() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { stores, selectedStore, salesCache, setSalesCache } = useMLStore();
  const { selectedMarketplace, activeMarketplace } = useMarketplace();
  const { selectedSeller, selectedStoreIds } = useSeller();

  // Resolve which stores are effectively selected
  const effectiveStores = useMemo<StoreRef[]>(() => {
    const allActive = (selectedSeller?.stores ?? []).filter((s) => s.is_active);
    const base = selectedStoreIds.length === 0 ? allActive : allActive.filter((s) => selectedStoreIds.includes(s.id));
    return base.map((s) => ({ id: s.id, marketplace: s.marketplace }));
  }, [selectedSeller, selectedStoreIds]);

  const mlStores = useMemo(() => effectiveStores.filter((s) => s.marketplace === "ml"), [effectiveStores]);
  const nonMlStores = useMemo(() => effectiveStores.filter((s) => s.marketplace !== "ml"), [effectiveStores]);

  const isML = selectedMarketplace === "mercado-livre" || (selectedStoreIds.length > 0 && mlStores.length > 0 && nonMlStores.length === 0);
  const isAll = selectedStoreIds.length === 0 && (selectedMarketplace === "all" || selectedMarketplace === "mercado-livre");
  const useRealData = mlStores.length > 0 || isAll;
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
  const [sellerReputation, setSellerReputation] = useState<any>(null);
  const { reputation: realReputation, isRealData: isRealReputation, refresh: refreshReputation } = useMLReputation();
  const [period, setPeriod] = useState(0);
  const [customRange, setCustomRange] = useState<DateRange>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("hourly");
  
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange>(null);
  const [pendingPeriod, setPendingPeriod] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => salesCache.lastSyncedAt ?? localStorage.getItem(LAST_ML_SYNC_KEY));
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const cacheLoadedRef = useRef(salesCache.daily.length > 0);
  const loadDailyReqRef = useRef(0); // incremented on each loadFromCache call; stale responses are ignored

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

  const isHourlyAvailable = (period === 0 && !customRange) || !!singleDayRange;
  const hourlyTargetDate = singleDayRange ?? (period === 0 ? todayUTC() : null);
  const activeFilterKey = customRange?.from
    ? `${format(startOfDay(customRange.from), "yyyy-MM-dd")}:${format(startOfDay(customRange.to ?? customRange.from), "yyyy-MM-dd")}`
    : `period:${period}`;

  useEffect(() => {
    setChartMode(isHourlyAvailable ? "hourly" : "daily");
  }, [activeFilterKey, isHourlyAvailable]);

  // Compute current and previous period date ranges
  const { currentFrom, currentTo, prevFrom, prevTo, fetchFrom, fetchTo } = useMemo(
    () => getComparisonRanges(customRange, period),
    [customRange, period],
  );


  // Chart range: always at least 7 days ending at currentTo (so the sparkline has enough data points)
  const adsChartFrom = useMemo(() => {
    const diffDays = differenceInCalendarDays(parseISO(currentTo), parseISO(currentFrom));
    if (diffDays < 6) {
      return format(subDays(parseISO(currentTo), 6), "yyyy-MM-dd");
    }
    return currentFrom;
  }, [currentFrom, currentTo]);

  // Ads hook uses the wider chart range so sparkline always has 7+ days
  const { daily: adsDaily, campaigns: adsCampaigns, loading: adsLoading } = useMLAds({
    dateFrom: adsChartFrom,
    dateTo: currentTo,
  });

  // Summary is computed from the exact selected period (not the wider chart range)
  const adsSummary = useMemo(
    () => computeAdsSummary(adsDaily.filter((d) => d.date >= currentFrom && d.date <= currentTo)),
    [adsDaily, currentFrom, currentTo],
  );
  // ── Cost card computations (placeholder – moved after effectiveMetrics) ──

  const daily = allDaily.filter((d) => d.date >= currentFrom && d.date <= currentTo);

  const previousDaily = allDaily.filter((d) => d.date >= prevFrom && d.date <= prevTo);

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
      ? `${format(customRange.from, "dd/MM")} – ${format(customRange.to, "dd/MM")}`
      : format(customRange.from, "dd/MM")
    : period === 0
      ? `Hoje — ${format(new Date(), "dd/MM")}`
      : (() => {
          const to = new Date();
          const from = new Date();
          from.setDate(to.getDate() - period);
          return `${period}d — ${format(from, "dd/MM")} a ${format(to, "dd/MM")}`;
        })();

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

  const loadFromCache = useCallback(async (overrideFrom?: string, overrideTo?: string): Promise<boolean> => {
    if (!user) return false;

    // Stamp this request; any older in-flight call that resolves after us will be discarded.
    const reqId = ++loadDailyReqRef.current;

    let userCacheQuery = supabase.from("ml_user_cache").select("*").eq("user_id", user.id);
    if (selectedStore !== "all") {
      userCacheQuery = userCacheQuery.eq("ml_user_id", Number(selectedStore));
    }

    // Use explicit dates if provided, otherwise derive from current state
    const { fromDate: stateFrom, toDate: stateTo } = getFilterDates(customRange, period);
    const filterFrom = overrideFrom ?? stateFrom;
    const filterTo = overrideTo ?? stateTo;

    let dailyCacheQuery = supabase
      .from("ml_daily_cache")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", filterFrom)
      .lte("date", filterTo)
      .order("date", { ascending: false })
      .limit(1000);
    if (selectedStore !== "all") {
      dailyCacheQuery = dailyCacheQuery.eq("ml_user_id", selectedStore);
    }

    const [{ data: userCacheData }, { data: dailyCache }] = await Promise.all([
      userCacheQuery.maybeSingle(),
      dailyCacheQuery,
    ]);

    // Discard stale response if a newer request has been issued
    if (reqId !== loadDailyReqRef.current) return false;

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
  }, [user, selectedStore, customRange, period]);

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
          rangeStart.setDate(today.getDate() - days);
        }

        const fromDateStr = format(rangeStart, "yyyy-MM-dd");
        const toDateStr = format(rangeEnd, "yyyy-MM-dd");
        const { fetchFrom, fetchTo, currentFrom, currentTo } = getComparisonRanges(
          effectiveFrom ? { from: effectiveFrom, to: effectiveTo ?? effectiveFrom } : null,
          effectiveFrom ? 0 : (opts?.periodDays ?? period),
        );

        // Sync each token in small chunks to avoid API truncation on larger periods
        const totalDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const totalChunks = Math.ceil(totalDays / SYNC_CHUNK_DAYS) * tokensToSync.length;
        let chunksDone = 0;
        setSyncProgress({ current: 0, total: totalChunks });

        let lastUserInfo: MLUser | null = null;
        for (const tokenInfo of tokensToSync) {
          let cursor = new Date(rangeStart);
          while (cursor <= rangeEnd) {
            const chunkStart = new Date(cursor);
            const chunkEnd = new Date(cursor);
            chunkEnd.setDate(chunkEnd.getDate() + (SYNC_CHUNK_DAYS - 1));
            if (chunkEnd > rangeEnd) chunkEnd.setTime(rangeEnd.getTime());

            const chunkFrom = format(chunkStart, "yyyy-MM-dd");
            const chunkTo = format(chunkEnd, "yyyy-MM-dd");

            const { data: syncData, error: syncError } = await supabase.functions.invoke(
              "mercado-libre-integration",
              {
                body: {
                  access_token: tokenInfo.access_token,
                  user_id: user.id,
                  date_from: chunkFrom,
                  date_to: chunkTo,
                  seller_id: stores.find(s => s.ml_user_id === tokenInfo.ml_user_id)?.seller_id || null,
                },
              },
            );

            if (syncError) throw syncError;
            if (!syncData?.success) throw new Error(syncData?.error || "Sync failed");
            if (syncData.user) lastUserInfo = syncData.user;
            if (syncData.seller_reputation) setSellerReputation(syncData.seller_reputation);

            chunksDone++;
            setSyncProgress({ current: chunksDone, total: totalChunks });

            cursor.setDate(cursor.getDate() + SYNC_CHUNK_DAYS);
          }
        }

        let hourlyDateOverride: string | null;
        if (effectiveFrom) {
          hourlyDateOverride = fromDateStr === toDateStr ? fromDateStr : null;
        } else {
          const days = opts?.periodDays ?? (period > 0 ? period : 1);
          hourlyDateOverride = days <= 1 ? todayUTC() : null;
        }

        await Promise.all([
          loadFromCache(fetchFrom, fetchTo),
          loadHourlyCache(hourlyDateOverride),
          loadProductCache(currentFrom, currentTo),
        ]);
        if (lastUserInfo) setMlUser(lastUserInfo);

        const now = new Date().toISOString();
        setLastSyncedAt(now);
        localStorage.setItem(LAST_ML_SYNC_KEY, now);
        localStorage.setItem(LAST_ML_SYNC_TS_KEY, String(Date.now()));

        // Log sync to ml_sync_log
        const daysCount = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        for (const tokenInfo of tokensToSync) {
          await supabase.from("ml_sync_log" as any).upsert(
            {
              user_id: user.id,
              ml_user_id: tokenInfo.ml_user_id,
              date_from: fromDateStr,
              date_to: toDateStr,
              days_synced: daysCount,
              source: "auto",
              synced_at: now,
            },
            { onConflict: "user_id,ml_user_id,date_from,date_to,source" },
          );
        }

        toast({ title: "Sincronizado", description: `Dados atualizados: ${fromDateStr} → ${toDateStr}.` });
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      } finally {
        setSyncing(false);
        setSyncProgress(null);
      }
    },
    [user, toast, period, customRange, selectedStore, stores, loadFromCache, loadHourlyCache, loadProductCache],
  );

  const reloadCache = useCallback(async () => {
    cacheLoadedRef.current = false;
      const { fetchFrom, fetchTo, currentFrom, currentTo } = getComparisonRanges(customRange, period);
      await Promise.all([loadFromCache(fetchFrom, fetchTo), loadHourlyCache(), loadProductCache(currentFrom, currentTo)]);
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
    const { fetchFrom, fetchTo, currentFrom, currentTo } = getComparisonRanges(customRange, period);
    void loadFromCache(fetchFrom, fetchTo);
    void loadHourlyCache();
    void loadProductCache(currentFrom, currentTo);
  }, [selectedStore]);

  // Recarrega diário, horário E produtos sempre que o filtro mudar
  useEffect(() => {
    if (!user) {
      setAllHourly([]);
      return;
    }
    void loadFromCache(fetchFrom, fetchTo);
    void loadHourlyCache();
    void loadProductCache(currentFrom, currentTo);
  }, [user, loadFromCache, loadHourlyCache, loadProductCache, activeFilterKey, fetchFrom, fetchTo, currentFrom, currentTo]);

  const handleConfirm = useCallback(() => {
    if (pendingRange?.from) {
      const resolvedTo = pendingRange.to ?? pendingRange.from;
      const resolvedRange = { from: pendingRange.from, to: resolvedTo };
      setCustomRange(resolvedRange);
      setPeriod(0);
      setPopoverOpen(false);
      // Only call the API if the range includes today or future dates.
      // Historical ranges load from cache (filled by historical sync).
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const toStr = format(startOfDay(resolvedRange.to), "yyyy-MM-dd");
      if (toStr >= todayStr) {
        syncFromAPI({ from: resolvedRange.from, to: resolvedRange.to });
      }
    } else if (pendingPeriod !== null) {
      setCustomRange(null);
      setPeriod(pendingPeriod);
      setPopoverOpen(false);
      syncFromAPI({ periodDays: pendingPeriod === 0 ? 1 : pendingPeriod });
    }
  }, [pendingRange, pendingPeriod, syncFromAPI]);

  // --- Mock data for non-ML marketplaces ---
  const mockDaily = useMemo(() => {
    // Specific non-ML stores selected → use per-store seeded data
    if (nonMlStores.length > 0) return aggregateStoreDailyData(nonMlStores, 30);
    // All stores / isAll with no stores configured → fall back to generic mock
    if (isAll) return getAllMarketplaceMockDaily(30);
    if (!useRealData) return getMarketplaceDailyData(selectedMarketplace, 30);
    return [];
  }, [nonMlStores, isAll, useRealData, selectedMarketplace]);

  const mockHourly = useMemo(() => {
    if (nonMlStores.length > 0) return aggregateStoreHourlyData(nonMlStores);
    if (isAll) return getAllMarketplaceMockHourly();
    if (!useRealData) return getMarketplaceHourlyData(selectedMarketplace);
    return [];
  }, [nonMlStores, isAll, useRealData, selectedMarketplace]);

  const mockProducts = useMemo(() => {
    if (nonMlStores.length > 0) return aggregateStoreProducts(nonMlStores);
    if (isAll) return getAllMarketplaceMockProducts();
    if (!useRealData) return getMarketplaceProducts(selectedMarketplace);
    return [];
  }, [nonMlStores, isAll, useRealData, selectedMarketplace]);

  // Merge real ML data with mock data when "all"
  const effectiveDaily = useMemo(() => {
    if (isAll) {
      // Merge real daily + mock daily by date, restricted to current period
      const dateMap = new Map<string, DailyBreakdown>();
      for (const d of daily) dateMap.set(d.date, { ...d });
      for (const d of mockDaily) {
        if (d.date < currentFrom || d.date > currentTo) continue;
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
    return mockDaily.filter((d) => d.date >= currentFrom && d.date <= currentTo);
  }, [isAll, isML, daily, mockDaily, currentFrom, currentTo]);

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

  // Previous period daily data (same merge logic)
  const effectivePreviousDaily = useMemo(() => {
    if (isAll) {
      const dateMap = new Map<string, DailyBreakdown>();
      for (const d of previousDaily) dateMap.set(d.date, { ...d });
      for (const d of mockDaily) {
        if (d.date < prevFrom || d.date > prevTo) continue;
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
      return Array.from(dateMap.values());
    }
    if (isML) return previousDaily;
    return mockDaily.filter(d => d.date >= prevFrom && d.date <= prevTo);
  }, [isAll, isML, previousDaily, mockDaily, prevFrom, prevTo]);

  const previousMetrics = useMemo(() => {
    if (effectivePreviousDaily.length === 0) return null;
    const m = {
      total_revenue: effectivePreviousDaily.reduce((s, d) => s + d.total, 0),
      units_sold: effectivePreviousDaily.reduce((s, d) => s + d.units_sold, 0),
      unique_visits: effectivePreviousDaily.reduce((s, d) => s + (d.unique_visits || 0), 0),
      unique_buyers: effectivePreviousDaily.reduce((s, d) => s + (d.unique_buyers || 0), 0),
      total_orders: effectivePreviousDaily.reduce((s, d) => s + d.qty, 0),
      avg_ticket: 0,
      conversion_rate: 0,
    };
    if (m.total_orders > 0) m.avg_ticket = m.total_revenue / m.total_orders;
    if (m.unique_visits > 0) m.conversion_rate = (m.unique_buyers / m.unique_visits) * 100;
    return m;
  }, [effectivePreviousDaily]);

  const calcDelta = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return undefined;
    return ((current - previous) / previous) * 100;
  };

  const deltaLabel = period === 0 ? "vs ontem" : customRange ? "vs período anterior" : `vs ${period}d anteriores`;

  // Per-marketplace hourly data for "Todos" grid view
  const perMarketplaceHourly = useMemo(() => {
    if (!isAll) return null;
    const mpIds = ["mercado-livre", "amazon", "shopee", "magalu"] as const;
    const mpList = mpIds.map((id) => {
      const brand = getMarketplaceBrand(id)!;
      const MpIcon = brand.icon;
      return {
        id,
        name: brand.name,
        data: id === "mercado-livre" ? hourly : getMarketplaceHourlyData(id),
        icon: <MpIcon className="w-4 h-4" />,
      };
    });
    return mpList.map((mp) => ({
      ...mp,
      chartData: buildHourlyChartData(mp.data),
    }));
  }, [isAll, hourly]);

  // ── Cost card computations ──────────────────────────────────────────────────
  const costSummary = useMemo(() => {
    const grossRevenue = effectiveMetrics?.total_revenue ?? 0;
    // Estimate ML commission (~11%) and shipping (~5%) from revenue
    const comissao = grossRevenue * 0.11;
    const frete = grossRevenue * 0.05;
    const ads = adsSummary.total_spend;
    const totalKnown = comissao + frete + ads;
    return {
      comissao,
      frete,
      publicidade: ads,
      custo_produto: 0 as number,
      impostos: 0 as number,
      total_known: totalKnown,
      gross_revenue: grossRevenue,
      pct_receita: grossRevenue > 0 ? Math.round((totalKnown / grossRevenue) * 10000) / 100 : 0,
    };
  }, [effectiveMetrics, adsSummary]);



  const MARKETPLACE_STROKE_COLORS: Record<string, string> = {
    "mercado-livre": "hsl(45, 93%, 47%)",
    amazon: "hsl(25, 95%, 53%)",
    shopee: "hsl(15, 85%, 50%)",
    magalu: "hsl(225, 70%, 55%)",
  };

  // Overlaid hourly chart data: { label, hour, "Mercado Livre": val, "Amazon": val, ... }
  const overlaidHourlyData = useMemo(() => {
    if (!isAll || !perMarketplaceHourly) return null;
    const buckets = Array.from({ length: 24 }, (_, hour) => {
      const row: Record<string, any> = { label: `${String(hour).padStart(2, "0")}h`, hour };
      for (const mp of perMarketplaceHourly) {
        const hourData = mp.data.filter((d) => d.hour === hour);
        row[mp.name] = hourData.reduce((s, d) => s + d.total, 0);
      }
      return row;
    });
    return buckets;
  }, [isAll, perMarketplaceHourly]);


  // Revenue by marketplace + store breakdown for "Todos" view
  const revenueByMarketplace = useMemo<MarketplaceRevenueGroup[]>(() => {
    if (!isAll || !selectedSeller) return [];
    const storeList = selectedSeller.stores.filter((s) => s.is_active);
    // Group stores by marketplace shortcode
    const grouped = new Map<string, typeof storeList>();
    for (const store of storeList) {
      const mp = store.marketplace;
      if (!grouped.has(mp)) grouped.set(mp, []);
      grouped.get(mp)!.push(store);
    }

    const result: MarketplaceRevenueGroup[] = [];
    for (const [mpShort, stores] of grouped) {
      const mpId = SELLER_TO_MP_ID[mpShort] ?? mpShort;
      const brand = getMarketplaceBrand(mpId);
      if (!brand) continue;

      let groupRevenue = 0;
      let groupOrders = 0;
      const storeRows = stores.map((store) => {
        let revenue = 0;
        let orders = 0;
        if (mpShort === "ml") {
          // Use real daily data
          revenue = daily.reduce((s, d) => s + d.total, 0);
          orders = daily.reduce((s, d) => s + d.qty, 0);
          // If multiple ML stores, split proportionally by store count (real per-store data not available yet)
          if (stores.length > 1) {
            revenue = revenue / stores.length;
            orders = Math.round(orders / stores.length);
          }
        } else {
          // Use mock store data
          const storeDaily = getStoreDailyData(store.id, mpShort, 30);
          revenue = storeDaily.reduce((s, d) => s + d.total, 0);
          orders = storeDaily.reduce((s, d) => s + d.qty, 0);
        }
        groupRevenue += revenue;
        groupOrders += orders;
        return { name: store.store_name, revenue, orders };
      });

      result.push({
        mpId,
        mpName: brand.name,
        icon: brand.icon,
        gradient: brand.gradient,
        totalRevenue: groupRevenue,
        totalOrders: groupOrders,
        stores: storeRows.sort((a, b) => b.revenue - a.revenue),
      });
    }

    return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [isAll, selectedSeller, daily]);


  // Show "not connected" when ML stores are selected but there's no valid API token
  const onlyMLSelected = mlStores.length > 0 && nonMlStores.length === 0;
  if (onlyMLSelected && !loading && !connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        
        <Plug className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold text-foreground">Mercado Livre não conectado</h2>
        <p className="text-muted-foreground text-sm">
          {mlStores.length === 1
            ? "Conecte sua conta do Mercado Livre para visualizar os dados desta loja."
            : `Conecte as ${mlStores.length} contas do Mercado Livre para visualizar os dados.`}
        </p>
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
    "Receita Total": d.total,
    "Venda Aprovada": d.approved,
    Pedidos: d.qty,
  }));

  const hourlyChartData = buildHourlyChartData(effectiveHourly);
  const showHourlyChart = (useRealData ? isHourlyAvailable : true) && chartMode === "hourly";
  const chartData = showHourlyChart ? hourlyChartData : dailyChartData;
  const hasData = useRealData ? allDaily.length > 0 || effectiveDaily.length > 0 : effectiveDaily.length > 0;
  const hasHourlyData = effectiveHourly.length > 0;
  const chartTitle = showHourlyChart ? `Receita por Hora — ${periodLabel}` : `Receita Diária — ${periodLabel}`;

  return (
    <div className="space-y-5">
      <Tabs defaultValue="vendas" className="space-y-4">

        <TabsContent value="vendas" className="space-y-5 mt-0 animate-fade-in">

      <AnimatePresence>
        {syncProgress && (() => {
          const pct = Math.round((syncProgress.current / syncProgress.total) * 100);
          const barColor = pct >= 100 ? "bg-[hsl(142,70%,45%)]" : pct >= 66 ? "bg-[hsl(25,95%,53%)]" : pct >= 33 ? "bg-[hsl(217,70%,45%)]" : "bg-[hsl(217,70%,45%)]";
          return (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 px-3 py-1.5 rounded-md border border-border/50 bg-muted/30 text-xs text-muted-foreground"
            >
              <Loader2 className="h-3 w-3 animate-spin shrink-0" />
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="tabular-nums">{pct}%</span>
            </motion.div>
          );
        })()}
      </AnimatePresence>
        <div className="flex items-center justify-between gap-4">
        <MLPageHeader title="Vendas" lastUpdated={useRealData && lastSyncedAt ? new Date(lastSyncedAt) : null} />
        <div className="flex items-center gap-2 flex-wrap">
          <TabsList className="h-8">
            <TabsTrigger value="vendas" className="text-xs px-3 h-7">Vendas</TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs px-3 h-7">Relatórios</TabsTrigger>
          </TabsList>
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
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-lg bg-muted/60 px-3 text-xs font-medium text-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer"
              >
                <span className="text-muted-foreground">Período:</span>
                <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                {periodLabel}
                <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
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
        </div>
      </div>

      {isML && !effectiveLoading && connected && !hasData && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-4">
            <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Nenhum dado no cache. Clique em <strong>Sincronizar</strong> ou use <strong>Histórico</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          title="Receita Total"
          value={effectiveMetrics ? currencyFmt(effectiveMetrics.total_revenue) : "—"}
          icon={<DollarSign className="w-4 h-4" />}
          variant="minimal"
          iconClassName="bg-accent/10 text-accent"
          size="compact"
          loading={effectiveLoading}
          refreshing={effectiveSyncing && !syncProgress}
          delta={effectiveMetrics && previousMetrics ? calcDelta(effectiveMetrics.total_revenue, previousMetrics.total_revenue) : undefined}

        />
        <KPICard
          title="Pedidos"
          value={effectiveMetrics ? String(effectiveMetrics.units_sold) : "—"}
          icon={<ShoppingCart className="w-4 h-4" />}
          variant="minimal"
          iconClassName="bg-[hsl(270,70%,50%)]/10 text-[hsl(270,70%,50%)]"
          size="compact"
          loading={effectiveLoading}
          refreshing={effectiveSyncing && !syncProgress}
          
          delta={effectiveMetrics && previousMetrics ? calcDelta(effectiveMetrics.units_sold, previousMetrics.units_sold) : undefined}

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
          variant="minimal"
          iconClassName="bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"
          size="compact"
          loading={effectiveLoading}
          refreshing={effectiveSyncing && !syncProgress}
          delta={effectiveMetrics && previousMetrics ? calcDelta(effectiveMetrics.avg_ticket, previousMetrics.avg_ticket) : undefined}

        />
        <KPICard
          title="Visitas"
          value={effectiveMetrics ? effectiveMetrics.unique_visits.toLocaleString("pt-BR") : "—"}
          icon={<Eye className="w-4 h-4" />}
          variant="minimal"
          iconClassName="bg-accent/10 text-accent"
          size="compact"
          loading={effectiveLoading}
          refreshing={effectiveSyncing && !syncProgress}
          delta={effectiveMetrics && previousMetrics ? calcDelta(effectiveMetrics.unique_visits, previousMetrics.unique_visits) : undefined}

        />
        <KPICard
          title="Conversão"
          value={effectiveMetrics ? `${effectiveMetrics.conversion_rate.toFixed(2)}%` : "—"}
          icon={<Percent className="w-4 h-4" />}
          variant="minimal"
          iconClassName="bg-success/10 text-success"
          size="compact"
          loading={effectiveLoading}
          refreshing={effectiveSyncing && !syncProgress}
          delta={effectiveMetrics && previousMetrics ? calcDelta(effectiveMetrics.conversion_rate, previousMetrics.conversion_rate) : undefined}

        />
      </div>

      {/* === Revenue by Marketplace (Todos) === */}
      {isAll && revenueByMarketplace.length > 0 && (
        <RevenueByMarketplace groups={revenueByMarketplace} />
      )}

      {/* === Hourly Charts + Goals === */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
      {isAll && overlaidHourlyData && perMarketplaceHourly ? (
        <Card>
          <div className="px-4 pt-4 pb-3">
            <span className="text-sm font-medium text-foreground">Receita por Hora — Todos os Marketplaces</span>
          </div>
          <CardContent className="px-4 pb-2 pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={overlaidHourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" interval={2} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip
                  formatter={(value: number, name: string) => [currencyFmt(Number(value)), name]}
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                />
                {perMarketplaceHourly.map((mp) => (
                  <Line
                    key={mp.id}
                    type="monotone"
                    dataKey={mp.name}
                    stroke={MARKETPLACE_STROKE_COLORS[mp.id] || "hsl(var(--primary))"}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (dailyChartData.length > 0 || showHourlyChart) ? (
        <Card>
          <div className="px-4 pt-4 pb-3">
            <span className="text-sm font-medium text-foreground">{chartTitle}</span>
          </div>
          <CardContent className="px-4 pb-2 pt-0">
            {showHourlyChart && !hasHourlyData && !syncing ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
                <p className="text-sm font-medium text-foreground">Sem dados horários</p>
                <p className="mt-1 text-xs text-muted-foreground">Sincronize para carregar.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--muted-foreground))"
                    interval={2}
                  />
                  <YAxis
                    yAxisId="revenue"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  {showHourlyChart && (
                    <YAxis
                      yAxisId="orders"
                      orientation="right"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  />
                  
                  {showHourlyChart ? (
                    <>
                      <Bar
                        yAxisId="orders"
                        dataKey="Pedidos"
                        fill="hsl(var(--primary))"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={24}
                      />
                      <Area
                        yAxisId="revenue"
                        type="monotone"
                        dataKey="Receita Total"
                        stroke="hsl(var(--accent))"
                        fill="url(#mlTotal)"
                        strokeWidth={2}
                      />
                    </>
                  ) : (
                    <Area
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="Receita Total"
                      stroke="hsl(var(--accent))"
                      fill="url(#mlTotal)"
                      strokeWidth={2}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      ) : <div /> /* empty grid cell when no chart */}

      <GoalsCard
        currentRevenue={effectiveMetrics?.total_revenue ?? 0}
        currentOrders={effectiveMetrics?.units_sold ?? 0}
        currentTicket={effectiveMetrics?.avg_ticket ?? 0}
        currentConversion={effectiveMetrics?.conversion_rate ?? 0}
      />
      </div>

      {/* === Custos + Funil + Publicidade === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card de Custos */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0 }}>
        <Card className="h-full">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Custos</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {costSummary.pct_receita.toFixed(1)}% da receita
            </span>
          </div>
          <CardContent className="px-4 pb-4">
            <div className="space-y-1">
              {/* Total known costs highlight */}
              <div className="flex items-end justify-between pb-2 mb-1 border-b border-border">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total de custos</p>
                  <p className="text-xl font-bold tabular-nums text-red-500">
                    {costSummary.total_known.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Receita bruta</p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {costSummary.gross_revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>

              {/* Known costs — from ML API */}
              {[
                {
                  icon: <DollarSign className="w-3.5 h-3.5 text-orange-400" />,
                  label: "Comissão ML",
                  value: costSummary.comissao,
                  real: true,
                },
                {
                  icon: <Truck className="w-3.5 h-3.5 text-blue-400" />,
                  label: "Frete",
                  value: costSummary.frete,
                  real: true,
                },
                {
                  icon: <Megaphone className="w-3.5 h-3.5 text-purple-400" />,
                  label: "Publicidade",
                  value: costSummary.publicidade,
                  real: true,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs py-1">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {item.icon}
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {costSummary.gross_revenue > 0
                        ? `${((item.value / costSummary.gross_revenue) * 100).toFixed(1)}%`
                        : "—"}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {item.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Pending costs — to be configured */}
              <div className="pt-2 mt-1 border-t border-border/50 space-y-1">
                {[
                  { icon: <Package className="w-3.5 h-3.5 text-muted-foreground/50" />, label: "Custo produto" },
                  { icon: <DollarSign className="w-3.5 h-3.5 text-muted-foreground/50" />, label: "Impostos" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs py-0.5 opacity-50">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {item.icon}
                      {item.label}
                    </span>
                    <span className="text-[10px] italic text-muted-foreground">a informar</span>
                  </div>
                ))}
              </div>

              {/* Estimated net */}
              <div className="flex items-center justify-between text-xs pt-2 mt-1 border-t border-border">
                <span className="text-muted-foreground font-medium">Lucro estimado</span>
                <span className={`font-bold tabular-nums ${(costSummary.gross_revenue - costSummary.total_known) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {(costSummary.gross_revenue - costSummary.total_known).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Ranking Top 5 */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
        <Card className="h-full">
          <div className="px-4 pt-4 pb-2">
            <span className="text-sm font-medium text-foreground">Top Anúncios</span>
          </div>
          <CardContent className="px-4 pb-4">
            {effectiveProducts.length > 0 ? (
              <div className="space-y-2">
                {effectiveProducts.slice(0, 5).map((p, i) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const medal = i < 3 ? medals[i] : null;
                  return (
                    <div key={p.item_id || i} className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-semibold text-muted-foreground">
                        {medal ?? `${i + 1}`}
                      </span>
                      {p.thumbnail && (
                        <img src={p.thumbnail} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                      )}
                      <span className="text-xs text-foreground truncate flex-1 leading-tight">
                        {p.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {p.available_quantity != null ? `${p.available_quantity} un` : "—"}
                      </span>
                      <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                        {p.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>
        </motion.div>

        {/* Card de Publicidade (ADS) */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="h-full">
            <div className="px-4 pt-4 pb-2">
              <span className="text-sm font-medium text-foreground">Publicidade</span>
            </div>
            <CardContent className="px-4 pb-4">
              {adsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Destaque: Gasto e ROAS */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gasto</p>
                       <p className="text-2xl font-bold text-foreground">
                        {adsSummary.total_spend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ROAS</p>
                      <p className={`text-2xl font-bold ${
                        adsSummary.avg_roas >= 3 ? "text-green-500" :
                        adsSummary.avg_roas >= 1.5 ? "text-yellow-500" :
                        "text-red-500"
                      }`}>
                        {adsSummary.avg_roas.toFixed(2)}x
                      </p>
                    </div>
                  </div>

                  {/* Sparkline ROAS */}
                  <div className="h-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={adsDaily}>
                        <XAxis dataKey="date" hide />
                        <defs>
                          <linearGradient id="colorRoasSparkline" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <RechartsTooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 11,
                            padding: "4px 8px",
                          }}
                          formatter={(value: number) => [`${value.toFixed(2)}x`, "ROAS"]}
                          labelFormatter={(label: string) => {
                            try {
                              return format(parseISO(label), "dd/MM", { locale: ptBR });
                            } catch { return label; }
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="roas"
                          stroke="hsl(var(--primary))"
                          strokeWidth={1.5}
                          fillOpacity={1}
                          fill="url(#colorRoasSparkline)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Métricas secundárias */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Receita</span>
                      <span className="font-semibold tabular-nums">
                        {adsSummary.total_attributed_revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Impressões</span>
                      <span className="font-semibold tabular-nums">{adsSummary.total_impressions.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Cliques</span>
                      <span className="font-semibold tabular-nums">{adsSummary.total_clicks.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Pedidos</span>
                      <span className="font-semibold tabular-nums">{adsSummary.total_attributed_orders.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">CTR</span>
                      <span className="font-semibold tabular-nums">{adsSummary.avg_ctr.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">CPC</span>
                      <span className="font-semibold tabular-nums">
                        {adsSummary.avg_cpc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Conv. ADS</span>
                      <span className="font-semibold tabular-nums">
                        {adsSummary.total_clicks > 0
                          ? ((adsSummary.total_attributed_orders / adsSummary.total_clicks) * 100).toFixed(2)
                          : "0.00"}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">CPP</span>
                      <span className="font-semibold tabular-nums">
                        {adsSummary.total_attributed_orders > 0
                          ? (adsSummary.total_spend / adsSummary.total_attributed_orders).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                          : "R$ 0,00"}
                      </span>
                    </div>
                   </div>
                </div>
              )}

            </CardContent>
          </Card>
        </motion.div>

      </div>
      {/* === Ranking de Anúncios === */}
      <TopSellingProducts products={effectiveProducts} loading={effectiveLoading} showOrigin={isAll} />

        </TabsContent>

        <TabsContent value="relatorios" className="mt-0 animate-fade-in">
          <MLRelatorios />
        </TabsContent>
      </Tabs>
    </div>
  );
}
