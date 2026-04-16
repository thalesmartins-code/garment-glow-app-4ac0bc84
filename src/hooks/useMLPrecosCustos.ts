import { useState, useEffect, useCallback, useMemo } from "react";
import { useMLStore } from "@/contexts/MLStoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MLItemPrice {
  item_id: string;
  title: string;
  thumbnail: string;
  category_id: string;
  listing_type_id: string;
  price_standard: number;
  price_promo: number | null;
  price_sale: number;
  currency_id: string;
  last_updated: string | null;
  has_promotion: boolean;
}

export interface MLListingCost {
  listing_type_id: string;
  listing_type_name: string;
  listing_exposure: string;
  sale_fee_amount: number;
  percentage_fee: number;
  fixed_fee: number;
  financing_add_on_fee: number;
  currency_id: string;
}

export interface MLPriceReference {
  item_id: string;
  title: string;
  thumbnail: string;
  listing_type_id: string;
  status: string;
  currency_id: string;
  current_price: number;
  suggested_price: number | null;
  lowest_price: number | null;
  percent_difference: number;
  applicable_suggestion: boolean;
  selling_fees: number;
  shipping_fees: number;
  graph: Array<{ price: { amount: number }; info: { title: string; sold_quantity: number } }>;
  last_updated: string | null;
}

// ── Module-level cache ────────────────────────────────────────────────────────

interface PrecosCache {
  items: MLItemPrice[];
  itemsTotal: number;
  references: MLPriceReference[];
  fetchedAt: number;
}

const cache = new Map<string, PrecosCache>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseMLPrecosCustosResult {
  items: MLItemPrice[];
  itemsTotal: number;
  references: MLPriceReference[];
  loading: boolean;
  isRealData: boolean;
  connected: boolean;
  refresh: () => Promise<void>;
  refreshing: boolean;
  /** Fetch listing costs on-demand (used by Calculadora) */
  fetchCosts: (params: {
    price: number;
    categoryId?: string;
    logisticType?: string;
    shippingMode?: string;
  }) => Promise<MLListingCost[]>;
}

export function useMLPrecosCustos(): UseMLPrecosCustosResult {
  const { stores, selectedStore, loading: storeLoading, scopeKey } = useMLStore();
  const { user } = useAuth();

  const [items, setItems] = useState<MLItemPrice[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [references, setReferences] = useState<MLPriceReference[]>([]);
  const [isRealData, setIsRealData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const connected = stores.length > 0;

  const storeId = useMemo(() => {
    if (selectedStore !== "all" && selectedStore) return selectedStore;
    if (stores.length > 0) return stores[0].ml_user_id;
    return null;
  }, [selectedStore, stores]);

  const cacheKey = `${scopeKey}:precos-custos`;

  const getAuthHeaders = useCallback(async () => {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    if (!accessToken) return null;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return {
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      _baseUrl: `https://${projectId}.supabase.co/functions/v1/ml-precos-custos`,
    };
  }, []);

  const callEdgeFn = useCallback(
    async (type: string, extraParams?: Record<string, string>) => {
      if (!storeId) return null;
      const auth = await getAuthHeaders();
      if (!auth) return null;

      const { _baseUrl, ...headers } = auth;
      const params = new URLSearchParams({ ml_user_id: storeId, type, ...extraParams });
      const res = await fetch(`${_baseUrl}?${params}`, { headers });
      if (!res.ok) {
        console.warn(`ml-precos-custos [${type}]: ${res.status}`);
        return null;
      }
      return res.json();
    },
    [storeId, getAuthHeaders],
  );

  const fetchAll = useCallback(
    async (force = false) => {
      if (!connected || !user || !storeId) return;

      const cached = cache.get(cacheKey);
      const cacheValid = !!(cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS);
      if (cacheValid && !force) {
        setItems(cached.items);
        setItemsTotal(cached.itemsTotal);
        setReferences(cached.references);
        setIsRealData(true);
        return;
      }

      setLoading(true);
      try {
        const [pricesData, refsData] = await Promise.all([
          callEdgeFn("prices"),
          callEdgeFn("references"),
        ]);

        const newItems: MLItemPrice[] = pricesData?.items ?? [];
        const newTotal: number = pricesData?.total ?? 0;
        const newRefs: MLPriceReference[] = refsData?.references ?? [];

        if (newItems.length > 0 || newRefs.length > 0) {
          setItems(newItems);
          setItemsTotal(newTotal);
          setReferences(newRefs);
          setIsRealData(true);
          cache.set(cacheKey, {
            items: newItems,
            itemsTotal: newTotal,
            references: newRefs,
            fetchedAt: Date.now(),
          });
          console.log(`ml-precos-custos: loaded ${newItems.length} items, ${newRefs.length} refs`);
        }
      } catch (err) {
        console.warn("ml-precos-custos: fetch error", err);
      } finally {
        setLoading(false);
      }
    },
    [connected, user, storeId, cacheKey, callEdgeFn],
  );

  /** Busca comissões com parâmetros dinâmicos (para a Calculadora) */
  const fetchCosts = useCallback(
    async ({
      price,
      categoryId,
      logisticType,
      shippingMode,
    }: {
      price: number;
      categoryId?: string;
      logisticType?: string;
      shippingMode?: string;
    }): Promise<MLListingCost[]> => {
      const extra: Record<string, string> = { price: String(price) };
      if (categoryId) extra.category_id = categoryId;
      if (logisticType) extra.logistic_type = logisticType;
      if (shippingMode) extra.shipping_mode = shippingMode;

      const data = await callEdgeFn("costs", extra);
      return data?.costs ?? [];
    },
    [callEdgeFn],
  );

  // Reset when store/seller changes
  useEffect(() => {
    setItems([]);
    setItemsTotal(0);
    setReferences([]);
    setIsRealData(false);
  }, [scopeKey]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll(true);
    setRefreshing(false);
  }, [fetchAll]);

  return {
    items,
    itemsTotal,
    references,
    loading: storeLoading || loading,
    isRealData,
    connected,
    refresh,
    refreshing,
    fetchCosts,
  };
}
