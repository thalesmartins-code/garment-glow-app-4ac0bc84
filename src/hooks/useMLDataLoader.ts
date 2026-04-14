import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMLStore } from "@/contexts/MLStoreContext";
import { fetchDailyCache, fetchHourlyCache, fetchProductDailyCache, fetchUserCache } from "@/services/mlCacheService";
import type { DateRange } from "./useMLFilters";
import { getFilterDates } from "./useMLFilters";
import type { DailyBreakdown, HourlyBreakdown, MLUser } from "@/types/mlCache";
import { mapDailyRow, mapHourlyRow } from "@/types/mlCache";
import type { ProductSalesRow } from "@/components/mercadolivre/TopSellingProducts";

// Re-export for consumers
export type { DailyBreakdown, HourlyBreakdown, MLUser };

export function useMLDataLoader(
  customRange: DateRange,
  period: number,
  isHourlyAvailable: boolean,
  hourlyTargetDate: string | null,
) {
  const { user } = useAuth();
  const { selectedStore, resolvedMLUserIds } = useMLStore();

  const [allDaily, setAllDaily] = useState<DailyBreakdown[]>([]);
  const [allHourly, setAllHourly] = useState<HourlyBreakdown[]>([]);
  const [allProductSales, setAllProductSales] = useState<(ProductSalesRow & { date: string })[]>([]);
  const [mlUser, setMlUser] = useState<MLUser | null>(null);
  const [productStockMap, setProductStockMap] = useState<Record<string, number>>({});

  const loadDailyReqRef = useRef(0);

  const loadProductCache = useCallback(
    async (fromDate: string, toDate: string) => {
      if (!user || resolvedMLUserIds.length === 0) {
        setAllProductSales([]);
        return;
      }
      const data = await fetchProductDailyCache(user.id, resolvedMLUserIds, fromDate, toDate, selectedStore);
      setAllProductSales(data as any);
    },
    [user, selectedStore, resolvedMLUserIds],
  );

  const loadHourlyCache = useCallback(
    async (overrideDate?: string | null) => {
      if (!user || resolvedMLUserIds.length === 0) {
        setAllHourly([]);
        return [] as HourlyBreakdown[];
      }

      const dateToFilter = overrideDate !== undefined ? overrideDate : hourlyTargetDate;
      const filterByDate = overrideDate !== undefined ? !!overrideDate : isHourlyAvailable && !!hourlyTargetDate;

      const data = await fetchHourlyCache(user.id, resolvedMLUserIds, selectedStore, filterByDate ? dateToFilter : null);
      const mapped = data.map(mapHourlyRow);
      setAllHourly(mapped);
      return mapped;
    },
    [user, isHourlyAvailable, hourlyTargetDate, selectedStore, resolvedMLUserIds],
  );

  const loadFromCache = useCallback(async (overrideFrom?: string, overrideTo?: string): Promise<boolean> => {
    if (!user || resolvedMLUserIds.length === 0) {
      setAllDaily([]);
      return false;
    }

    const reqId = ++loadDailyReqRef.current;

    const { fromDate: stateFrom, toDate: stateTo } = getFilterDates(customRange, period);
    const filterFrom = overrideFrom ?? stateFrom;
    const filterTo = overrideTo ?? stateTo;

    const [userCacheData, dailyCache] = await Promise.all([
      fetchUserCache(user.id, resolvedMLUserIds, selectedStore),
      fetchDailyCache(user.id, resolvedMLUserIds, filterFrom, filterTo, selectedStore),
    ]);

    if (reqId !== loadDailyReqRef.current) return false;

    if (userCacheData) {
      setMlUser({
        id: userCacheData.ml_user_id,
        nickname: userCacheData.nickname ?? "",
        country: userCacheData.country ?? "",
        permalink: userCacheData.permalink ?? "",
      });
    }

    if (!dailyCache || dailyCache.length === 0) {
      setAllDaily([]);
      return !!userCacheData;
    }

    setAllDaily(dailyCache.map(mapDailyRow));
    return true;
  }, [user, selectedStore, resolvedMLUserIds, customRange, period]);

  const resetState = useCallback(() => {
    setAllDaily([]);
    setAllHourly([]);
    setAllProductSales([]);
    setMlUser(null);
    setProductStockMap({});
  }, []);

  return {
    allDaily, setAllDaily,
    allHourly, setAllHourly,
    allProductSales, setAllProductSales,
    mlUser, setMlUser,
    productStockMap, setProductStockMap,
    loadFromCache,
    loadHourlyCache,
    loadProductCache,
    resetState,
  };
}
