import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MLStore {
  ml_user_id: string;
  nickname: string | null;
  custom_name: string | null;
  access_token: string;
  displayName: string;
}

export interface MLSalesDaily {
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

export interface MLSalesHourly {
  date: string;
  hour: number;
  total: number;
  approved: number;
  qty: number;
}

export interface MLSalesProduct {
  item_id: string;
  date: string;
  title: string;
  thumbnail: string | null;
  qty_sold: number;
  revenue: number;
}

export interface MLUserInfo {
  id: number;
  nickname: string;
  country: string;
  permalink: string;
}

export interface MLSalesCache {
  daily: MLSalesDaily[];
  hourly: MLSalesHourly[];
  products: MLSalesProduct[];
  mlUser: MLUserInfo | null;
  connected: boolean;
  lastSyncedAt: string | null;
  accessToken: string | null;
  productStockMap: Record<string, number>;
}

interface MLStoreState {
  stores: MLStore[];
  selectedStore: string;
  setSelectedStore: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
  // Sales data cache
  salesCache: MLSalesCache;
  setSalesCache: (updater: (prev: MLSalesCache) => MLSalesCache) => void;
}

const defaultSalesCache: MLSalesCache = {
  daily: [],
  hourly: [],
  products: [],
  mlUser: null,
  connected: false,
  lastSyncedAt: null,
  accessToken: null,
  productStockMap: {},
};

const MLStoreContext = createContext<MLStoreState | null>(null);

export function MLStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stores, setStores] = useState<MLStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [salesCache, setSalesCacheRaw] = useState<MLSalesCache>(defaultSalesCache);

  const setSalesCache = useCallback((updater: (prev: MLSalesCache) => MLSalesCache) => {
    setSalesCacheRaw(updater);
  }, []);

  // Reset sales cache when store changes
  const handleSetSelectedStore = useCallback((id: string) => {
    setSelectedStore(id);
    setSalesCacheRaw(defaultSalesCache);
  }, []);

  const fetchStores = useCallback(async () => {
    if (!user) {
      setStores([]);
      setLoading(false);
      return;
    }

    try {
      const { data: tokens } = await supabase
        .from("ml_tokens")
        .select("ml_user_id, access_token")
        .eq("user_id", user.id)
        .not("access_token", "is", null);

      if (!tokens || tokens.length === 0) {
        setStores([]);
        setLoading(false);
        return;
      }

      const { data: userCaches } = await supabase
        .from("ml_user_cache")
        .select("ml_user_id, nickname, custom_name")
        .eq("user_id", user.id);

      const cacheMap: Record<string, { nickname: string | null; custom_name: string | null }> = {};
      (userCaches || []).forEach((c: any) => {
        cacheMap[String(c.ml_user_id)] = {
          nickname: c.nickname,
          custom_name: c.custom_name ?? null,
        };
      });

      const storeList: MLStore[] = tokens
        .filter((t) => t.ml_user_id)
        .map((t) => {
          const cache = cacheMap[t.ml_user_id!] || { nickname: null, custom_name: null };
          return {
            ml_user_id: t.ml_user_id!,
            nickname: cache.nickname,
            custom_name: cache.custom_name,
            access_token: t.access_token!,
            displayName: cache.custom_name || cache.nickname || `Loja ${t.ml_user_id}`,
          };
        });

      setStores(storeList);

      if (storeList.length === 1) {
        setSelectedStore(storeList[0].ml_user_id);
      }
    } catch (err) {
      console.error("Failed to fetch ML stores:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return (
    <MLStoreContext.Provider
      value={{
        stores,
        selectedStore,
        setSelectedStore: handleSetSelectedStore,
        loading,
        refresh: fetchStores,
        salesCache,
        setSalesCache,
      }}
    >
      {children}
    </MLStoreContext.Provider>
  );
}

export function useMLStore() {
  const ctx = useContext(MLStoreContext);
  if (!ctx) throw new Error("useMLStore must be used within MLStoreProvider");
  return ctx;
}
