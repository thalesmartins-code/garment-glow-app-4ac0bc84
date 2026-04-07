import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMLStore } from "@/contexts/MLStoreContext";
import { useToast } from "@/hooks/use-toast";

export interface ProductVariation {
  variation_id: string;
  attribute_combinations: { id: string; name: string; value: string }[];
  available_quantity: number;
  sold_quantity: number;
  price: number;
  picture_id: string | null;
}

export interface ProductItem {
  id: string;
  title: string;
  available_quantity: number;
  sold_quantity: number;
  price: number;
  currency_id: string;
  thumbnail: string | null;
  status: string;
  category_id: string | null;
  listing_type_id: string | null;
  health: number | null;
  visits: number;
  brand: string | null;
  has_variations: boolean;
  variations: ProductVariation[];
}

interface InventorySummary {
  totalItems: number;
  totalStock: number;
  outOfStock: number;
  lowStock: number;
}

interface MLInventoryState {
  items: ProductItem[];
  summary: InventorySummary | null;
  loading: boolean;
  hasToken: boolean | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

const MLInventoryContext = createContext<MLInventoryState | null>(null);

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function MLInventoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { stores, selectedStore } = useMLStore();
  const { toast } = useToast();

  const [items, setItems] = useState<ProductItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determine which tokens to use based on store selection
  const getTokensToFetch = useCallback(() => {
    if (selectedStore === "all") {
      return stores.map((s) => s.access_token);
    }
    const store = stores.find((s) => s.ml_user_id === selectedStore);
    return store ? [store.access_token] : [];
  }, [stores, selectedStore]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const tokens = getTokensToFetch();
    if (tokens.length === 0) {
      setHasToken(false);
      return;
    }

    setHasToken(true);
    setLoading(true);
    try {
      let allItems: ProductItem[] = [];
      let mergedSummary: InventorySummary = { totalItems: 0, totalStock: 0, outOfStock: 0, lowStock: 0 };

      for (const token of tokens) {
        const { data, error } = await supabase.functions.invoke("ml-inventory", {
          body: { access_token: token },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const rawItems: ProductItem[] = (data.items || []).map((item: any) => ({
          ...item,
          has_variations: item.has_variations ?? false,
          variations: item.variations ?? [],
        }));

        allItems = [...allItems, ...rawItems];

        if (data.summary) {
          mergedSummary.totalItems += data.summary.totalItems || 0;
          mergedSummary.totalStock += data.summary.totalStock || 0;
          mergedSummary.outOfStock += data.summary.outOfStock || 0;
          mergedSummary.lowStock += data.summary.lowStock || 0;
        }
      }

      setItems(allItems);
      setSummary(mergedSummary);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("ML inventory fetch error:", err);
      toast({ title: "Erro ao carregar dados", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, getTokensToFetch, toast]);

  // Update hasToken when stores change
  useEffect(() => {
    setHasToken(stores.length > 0 ? true : null);
  }, [stores]);

  // Fetch once when stores are available, then auto-refresh
  useEffect(() => {
    if (stores.length === 0) return;
    if (items.length === 0 && !lastUpdated) {
      fetchData();
    }
    intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stores.length, fetchData, items.length, lastUpdated]);

  // Re-fetch when store selection changes
  useEffect(() => {
    if (stores.length > 0 && lastUpdated) {
      fetchData();
    }
  }, [selectedStore]);

  return (
    <MLInventoryContext.Provider value={{ items, summary, loading, hasToken, lastUpdated, refresh: fetchData }}>
      {children}
    </MLInventoryContext.Provider>
  );
}

export function useMLInventory() {
  const ctx = useContext(MLInventoryContext);
  if (!ctx) throw new Error("useMLInventory must be used within MLInventoryProvider");
  return ctx;
}
