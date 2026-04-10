import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSeller } from "@/contexts/SellerContext";

export interface MLStore {
  ml_user_id: string;
  nickname: string | null;
  custom_name: string | null;
  access_token: string;
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
  const { selectedSeller, selectedStoreIds } = useSeller();
  const [stores, setStores] = useState<MLStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesCache, setSalesCacheRaw] = useState<MLSalesCache>(defaultSalesCache);

  const setSalesCache = useCallback((updater: (prev: MLSalesCache) => MLSalesCache) => {
    setSalesCacheRaw(updater);
  }, []);

  // Derive selectedStore from SellerContext.selectedStoreIds
  const selectedStore = useMemo(() => {
    if (selectedStoreIds.length === 0) return "all";

    // Map seller_stores ids → external_ids → find matching ml_user_ids
    const sellerStores = (selectedSeller?.stores ?? []).filter(
      (s) => s.is_active && s.marketplace === "ml" && selectedStoreIds.includes(s.id)
    );

    if (sellerStores.length === 0) return "all";

    // Get the external_ids (which should match ml_user_id)
    const externalIds = sellerStores
      .map((s) => s.external_id)
      .filter((id): id is string => !!id);

    if (externalIds.length === 0) return "all";

    // If exactly one ML store is selected, return its ml_user_id
    if (externalIds.length === 1) {
      const matched = stores.find((s) => s.ml_user_id === externalIds[0]);
      return matched ? matched.ml_user_id : "all";
    }

    // Multiple ML stores selected — check if it's ALL stores for this seller
    const allMlExternalIds = (selectedSeller?.stores ?? [])
      .filter((s) => s.is_active && s.marketplace === "ml" && s.external_id)
      .map((s) => s.external_id!);

    const allSelected = allMlExternalIds.every((id) => externalIds.includes(id));
    if (allSelected) return "all";

    // Multiple but not all — return the first one (best effort)
    const matched = stores.find((s) => externalIds.includes(s.ml_user_id));
    return matched ? matched.ml_user_id : "all";
  }, [selectedStoreIds, selectedSeller, stores]);

  // Reset sales cache when derived selectedStore changes
  const prevStoreRef = useMemo(() => ({ current: selectedStore }), []);
  useEffect(() => {
    if (prevStoreRef.current !== selectedStore) {
      prevStoreRef.current = selectedStore;
      setSalesCacheRaw(defaultSalesCache);
    }
  }, [selectedStore, prevStoreRef]);

  // setSelectedStore is now a no-op externally (selection comes from SellerContext)
  const setSelectedStore = useCallback((_id: string) => {
    // No-op — store selection is driven by SellerContext.selectedStoreIds
  }, []);

  const fetchStores = useCallback(async () => {
    if (!user) {
      setStores([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("ml_tokens")
        .select("ml_user_id, access_token, seller_id")
        .eq("user_id", user.id)
        .not("access_token", "is", null);

      if (selectedSeller?.id) {
        query = query.eq("seller_id", selectedSeller.id);
      }

      const { data: tokens } = await query;

      if (!tokens || tokens.length === 0) {
        setStores([]);
        setSalesCacheRaw(defaultSalesCache);
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
            seller_id: (t as any).seller_id || null,
          };
        });

      setStores(storeList);
      setSalesCacheRaw(defaultSalesCache);
    } catch (err) {
      console.error("Failed to fetch ML stores:", err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedSeller?.id]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return (
    <MLStoreContext.Provider
      value={{
        stores,
        selectedStore,
        setSelectedStore,
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

export function useMLStoreSafe() {
  return useContext(MLStoreContext);
}
