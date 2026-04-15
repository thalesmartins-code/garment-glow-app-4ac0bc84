import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHeaderScope } from "@/contexts/HeaderScopeContext";

export interface MLStore {
  ml_user_id: string;
  nickname: string | null;
  custom_name: string | null;
  displayName: string;
  seller_id: string | null;
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
  salesCache: MLSalesCache;
  setSalesCache: (updater: (prev: MLSalesCache) => MLSalesCache) => void;
  // Scope fields
  scopeKey: string;
  sellerId: string | null;
  resolvedMLUserIds: string[];
  hasMLConnection: boolean;
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
  const scope = useHeaderScope();
  const { sellerId, resolvedMLUserIds, scopeKey, hasMLConnection, tokens, loading: scopeLoading } = scope;

  const [stores, setStores] = useState<MLStore[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);
  const [salesCache, setSalesCacheRaw] = useState<MLSalesCache>(defaultSalesCache);

  const setSalesCache = useCallback((updater: (prev: MLSalesCache) => MLSalesCache) => {
    setSalesCacheRaw(updater);
  }, []);

  // Derive selectedStore from scope
  const selectedStore = useMemo(() => {
    if (resolvedMLUserIds.length === 1) return resolvedMLUserIds[0];
    return "all";
  }, [resolvedMLUserIds]);

  // No-op — selection comes from HeaderScopeContext
  const setSelectedStore = useCallback((_id: string) => {}, []);

  // Build stores list from scope tokens + user cache
  const fetchStores = useCallback(async () => {
    if (!user || !sellerId || tokens.length === 0) {
      setStores([]);
      setLoading(false);
      hasLoadedOnce.current = true;
      return;
    }

    // Only show loading skeleton on first load, not on refetches
    if (!hasLoadedOnce.current) setLoading(true);

    try {
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

      const storeList: MLStore[] = tokens.map((t) => {
        const cache = cacheMap[t.ml_user_id] || { nickname: null, custom_name: null };
        return {
          ml_user_id: t.ml_user_id,
          nickname: cache.nickname,
          custom_name: cache.custom_name,
          displayName: cache.custom_name || cache.nickname || `Loja ${t.ml_user_id}`,
          seller_id: t.seller_id,
        };
      });

      setStores(storeList);
    } catch (err) {
      console.error("Failed to fetch ML stores:", err);
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, [user, sellerId, tokens]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Reset salesCache when scopeKey changes
  useEffect(() => {
    setSalesCacheRaw(defaultSalesCache);
  }, [scopeKey]);

  return (
    <MLStoreContext.Provider
      value={{
        stores,
        selectedStore,
        setSelectedStore,
        loading: loading || scopeLoading,
        refresh: fetchStores,
        salesCache,
        setSalesCache,
        scopeKey,
        sellerId,
        resolvedMLUserIds,
        hasMLConnection,
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

export function useMLStoreSafe() {
  return useContext(MLStoreContext);
}
