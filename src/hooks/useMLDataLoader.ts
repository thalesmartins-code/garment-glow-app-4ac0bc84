import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMLStore } from "@/contexts/MLStoreContext";
import { fetchDailyCache, fetchHourlyCache, fetchProductDailyCache, fetchUserCache } from "@/services/mlCacheService";
import type { DateRange } from "./useMLFilters";
import { getFilterDates, todayUTC } from "./useMLFilters";
import type { ProductSalesRow } from "@/components/mercadolivre/TopSellingProducts";

export interface DailyBreakdown {
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

export interface HourlyBreakdown {
  date: string;
  hour: number;
  total: number;
  approved: number;
  qty: number;
  ml_user_id?: string;
}

export interface MLUser {
  id: number;
  nickname: string;
  country: string;
  permalink: string;
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
    ml_user_id: row.ml_user_id ?? undefined,
  };
}

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
