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

export function useMLAds(opts: UseMLAdsOptions = {}): UseMLAdsResult {
  const { daysBack = 30, dateFrom, dateTo } = opts;
  const { stores, selectedStore, loading: storeLoading } = useMLStore();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [realData, setRealData] = useState<{
    daily: AdsDailyStat[];
    campaigns: AdsCampaign[];
    products: AdsProductStat[];
    summary: AdsSummary;
  } | null>(null);
  const [isRealData, setIsRealData] = useState(false);
  const [loading, setLoading] = useState(false);

  const storeId = useMemo(() => {
    if (selectedStore !== "all" && selectedStore) return selectedStore;
    if (stores.length > 0) return stores[0].ml_user_id;
    return "default-store";
  }, [selectedStore, stores]);

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

  // Fetch real data from edge function
  const fetchRealData = useCallback(async () => {
    if (!connected || !user || storeId === "default-store") return;

    // For "all" stores, use the first store
    const targetStoreId = storeId === "default-store" ? stores[0]?.ml_user_id : storeId;
    if (!targetStoreId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ml-ads", {
        body: null,
        headers: { "Content-Type": "application/json" },
        method: "GET",
      });

      // supabase.functions.invoke doesn't support query params natively,
      // so we construct the URL manually
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const supabaseUrl = `https://${projectId}.supabase.co/functions/v1/ml-ads?ml_user_id=${encodeURIComponent(targetStoreId)}&date_from=${effectiveDateFrom}&date_to=${effectiveDateTo}`;
      
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) {
        console.warn("ml-ads: No auth session, falling back to mock");
        return;
      }

      const res = await fetch(supabaseUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
        },
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.warn(`ml-ads: API returned ${res.status}`, errBody);
        return;
      }

      const result = await res.json();
      if (result.daily && result.daily.length > 0) {
        setRealData({
          daily: result.daily,
          campaigns: result.campaigns || [],
          products: result.products || [],
          summary: result.summary || computeAdsSummary(result.daily),
        });
        setIsRealData(true);
      } else {
        console.log("ml-ads: No daily data returned, using mock");
      }
    } catch (err) {
      console.warn("ml-ads: Error fetching real data, falling back to mock", err);
    } finally {
      setLoading(false);
    }
  }, [connected, user, storeId, stores, effectiveDateFrom, effectiveDateTo]);

  // Auto-fetch on mount and when params change
  useEffect(() => {
    setRealData(null);
    setIsRealData(false);
    fetchRealData();
  }, [fetchRealData]);

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
    await fetchRealData();
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
    sync,
    syncing,
  };
}
