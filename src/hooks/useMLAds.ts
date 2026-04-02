import { useState, useEffect, useCallback, useMemo } from "react";
import { format, subDays } from "date-fns";
import { useMLStore } from "@/contexts/MLStoreContext";
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
  /** true = showing real ML Ads data, false = mock */
  isRealData: boolean;
  sync: () => Promise<void>;
  syncing: boolean;
}

/**
 * Provides ADS data for the Publicidade dashboard.
 *
 * Currently returns seeded mock data. When the ML Ads Edge Function is
 * implemented, replace the `fetchReal*` stubs below with real API calls
 * and set `isRealData = true`.
 */
export function useMLAds(opts: UseMLAdsOptions = {}): UseMLAdsResult {
  const { daysBack = 30, dateFrom, dateTo } = opts;
  const { stores, selectedStore, loading: storeLoading } = useMLStore();
  const [syncing, setSyncing] = useState(false);

  // Determine effective store id for seeding
  const storeId = useMemo(() => {
    if (selectedStore !== "all" && selectedStore) return selectedStore;
    if (stores.length > 0) return stores[0].ml_user_id;
    return "default-store";
  }, [selectedStore, stores]);

  const connected = stores.length > 0;

  // Compute date range
  const effectiveDaysBack = useMemo(() => {
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
    }
    return daysBack;
  }, [daysBack, dateFrom, dateTo]);

  // Generate mock data (stable references via useMemo)
  const allDaily = useMemo(
    () => getMockAdsDailyStats(storeId, Math.max(effectiveDaysBack, 30)),
    [storeId, effectiveDaysBack]
  );

  // Filter to selected date range
  const daily = useMemo(() => {
    if (dateFrom && dateTo) {
      return allDaily.filter((d) => d.date >= dateFrom && d.date <= dateTo);
    }
    const cutoff = format(subDays(new Date(), effectiveDaysBack - 1), "yyyy-MM-dd");
    return allDaily.filter((d) => d.date >= cutoff);
  }, [allDaily, dateFrom, dateTo, effectiveDaysBack]);

  const campaigns = useMemo(() => getMockAdsCampaigns(storeId), [storeId]);
  const products = useMemo(() => getMockAdsProducts(storeId), [storeId]);
  const summary = useMemo(() => computeAdsSummary(daily), [daily]);

  // Placeholder sync — extend this when the Edge Function for ADS is built
  const sync = useCallback(async () => {
    if (!connected) return;
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 1200)); // simulate latency
    setSyncing(false);
  }, [connected]);

  return {
    daily,
    campaigns,
    products,
    summary,
    loading: storeLoading,
    connected,
    isRealData: false,
    sync,
    syncing,
  };
}
