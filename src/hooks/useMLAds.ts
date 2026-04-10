import { useState, useEffect, useCallback, useMemo } from "react";
import { format, subDays } from "date-fns";
import { useMLStore } from "@/contexts/MLStoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getMockAdsDailyStats,
  getMockAdsCampaigns,
  getMockAdsProducts,
  computeAdsSummary,
  type AdsDailyStat,
  type AdsCampaign,
  type AdsProductStat,
  type AdsSummary,
} from "@/data/adsMockData";

// Module-level cache survives component unmount/remount (navigation)
interface AdsCache {
  daily: AdsDailyStat[];
  campaigns: AdsCampaign[];
  products: AdsProductStat[];
  summary: AdsSummary;
  fetchedAt: number;
}
const adsCache = new Map<string, AdsCache>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type { AdsDailyStat, AdsCampaign, AdsProductStat, AdsSummary };

export interface UseMLAdsOptions {
  daysBack?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface UseMLAdsResult {
  daily: AdsDailyStat[];
  campaigns: AdsCampaign[];
  products: AdsProductStat[];
  summary: AdsSummary;
  loading: boolean;
  connected: boolean;
  isRealData: boolean;
  adsAvailable: boolean | null;
  sync: () => Promise<void>;
  syncing: boolean;
}

export function useMLAds(opts: UseMLAdsOptions = {}): UseMLAdsResult {
  const { daysBack = 30, dateFrom, dateTo } = opts;
  const { stores, selectedStore, loading: storeLoading, scopeKey, hasMLConnection } = useMLStore();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [realData, setRealData] = useState<{
    daily: AdsDailyStat[];
    campaigns: AdsCampaign[];
    products: AdsProductStat[];
    summary: AdsSummary;
  } | null>(null);
  const [isRealData, setIsRealData] = useState(false);
  const [adsAvailable, setAdsAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // When a specific store is selected use it; when "all" use all store IDs
  const targetStoreIds = useMemo(() => {
    if (selectedStore !== "all" && selectedStore) return [selectedStore];
    return stores.map((s) => s.ml_user_id);
  }, [selectedStore, stores]);

  // Single storeId used as cache key and mock seed (first store or specific)
  const storeId = targetStoreIds[0] ?? "default-store";

  const connected = stores.length > 0;

  // Compute effective date range
  const effectiveDateFrom = useMemo(() => {
    if (dateFrom) return dateFrom;
    return format(subDays(new Date(), daysBack - 1), "yyyy-MM-dd");
  }, [daysBack, dateFrom]);

  const effectiveDateTo = useMemo(() => {
    if (dateTo) return dateTo;
    return format(new Date(), "yyyy-MM-dd");
  }, [dateTo]);

  const effectiveDaysBack = useMemo(() => {
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
    }
    return daysBack;
  }, [daysBack, dateFrom, dateTo]);

  // Include scopeKey in cache key so seller/store changes invalidate cache
  const cacheKey = `${scopeKey}:${effectiveDateFrom}:${effectiveDateTo}`;

  // Fetch one store's ads data from the edge function
  const fetchOneStore = useCallback(async (
    targetStoreId: string,
    accessToken: string,
    force: boolean,
  ) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const params = new URLSearchParams({
      ml_user_id: targetStoreId,
      date_from: effectiveDateFrom,
      date_to: effectiveDateTo,
    });
    if (force) params.set("force", "true");

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/ml-ads?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
        },
      },
    );
    if (!res.ok) return null;
    return res.json();
  }, [effectiveDateFrom, effectiveDateTo]);

  // Fetch real data — handles single store or aggregates multiple stores
  const fetchRealData = useCallback(async (force = false) => {
    if (!connected || !user || targetStoreIds.length === 0) return;

    const hasCachedData = !!(adsCache.get(cacheKey) && Date.now() - (adsCache.get(cacheKey)?.fetchedAt ?? 0) < CACHE_TTL_MS);
    if (!hasCachedData) setLoading(true);

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) {
        console.warn("ml-ads: No auth session, falling back to mock");
        return;
      }

      const results = await Promise.all(
        targetStoreIds.map((id) => fetchOneStore(id, accessToken, force)),
      );

      // Aggregate across stores
      const aggregated: { daily: AdsDailyStat[]; campaigns: AdsCampaign[]; products: AdsProductStat[] } = {
        daily: [],
        campaigns: [],
        products: [],
      };
      let anyAvailable = false;

      for (const result of results) {
        if (!result) continue;
        if (result.adsAvailable === true) anyAvailable = true;
        if (result.daily?.length) {
          for (const row of result.daily as AdsDailyStat[]) {
            const existing = aggregated.daily.find((d) => d.date === row.date);
            if (existing) {
              existing.impressions = (existing.impressions ?? 0) + (row.impressions ?? 0);
              existing.clicks      = (existing.clicks      ?? 0) + (row.clicks      ?? 0);
              existing.spend       = (existing.spend       ?? 0) + (row.spend       ?? 0);
            } else {
              aggregated.daily.push({ ...row });
            }
          }
        }
        if (result.campaigns?.length) aggregated.campaigns.push(...result.campaigns);
        if (result.products?.length)  aggregated.products.push(...result.products);
      }

      if (anyAvailable) setAdsAvailable(true);

      if (aggregated.daily.length > 0) {
        const summary = computeAdsSummary(aggregated.daily);
        const cached: AdsCache = { ...aggregated, summary, fetchedAt: Date.now() };
        setRealData({ ...aggregated, summary });
        adsCache.set(cacheKey, cached);
        setIsRealData(true);
        console.log(`ml-ads: loaded ${targetStoreIds.length} store(s)`);
      } else {
        console.log("ml-ads: no data for period, using mock");
      }
    } catch (err) {
      console.warn("ml-ads: Error fetching real data, falling back to mock", err);
    } finally {
      setLoading(false);
    }
  }, [connected, user, targetStoreIds, cacheKey, fetchOneStore]);

  // Reset when scope changes (seller/store switch)
  useEffect(() => {
    setRealData(null);
    setIsRealData(false);
    setAdsAvailable(null);
  }, [scopeKey]);

  // Auto-fetch on mount and when params change — skip if cache is still fresh
  useEffect(() => {
    if (!hasMLConnection) return;

    const cached = adsCache.get(cacheKey);
    const cacheValid = !!(cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS);
    if (cacheValid) {
      setRealData(cached);
      setIsRealData(true);
      return;
    }
    setRealData(null);
    setIsRealData(false);
    fetchRealData();
  }, [fetchRealData, cacheKey, hasMLConnection]);

  // Mock data fallback
  const allDaily = useMemo(
    () => getMockAdsDailyStats(storeId, Math.max(effectiveDaysBack, 30)),
    [storeId, effectiveDaysBack]
  );

  const mockDaily = useMemo(() => {
    if (dateFrom && dateTo) {
      return allDaily.filter((d) => d.date >= dateFrom && d.date <= dateTo);
    }
    const cutoff = format(subDays(new Date(), effectiveDaysBack - 1), "yyyy-MM-dd");
    return allDaily.filter((d) => d.date >= cutoff);
  }, [allDaily, dateFrom, dateTo, effectiveDaysBack]);

  const mockCampaigns = useMemo(() => getMockAdsCampaigns(storeId), [storeId]);
  const mockProducts = useMemo(() => getMockAdsProducts(storeId), [storeId]);
  const mockSummary = useMemo(() => computeAdsSummary(mockDaily), [mockDaily]);

  // Use real data if available, otherwise mock
  const daily = realData?.daily ?? mockDaily;
  const campaigns = realData?.campaigns ?? mockCampaigns;
  const products = realData?.products ?? mockProducts;
  const summary = realData?.summary ?? mockSummary;

  const sync = useCallback(async () => {
    if (!connected) return;
    setSyncing(true);
    await fetchRealData(true);
    setSyncing(false);
  }, [connected, fetchRealData]);

  return {
    daily,
    campaigns,
    products,
    summary,
    loading: storeLoading || loading,
    connected,
    isRealData,
    adsAvailable,
    sync,
    syncing,
  };
}
