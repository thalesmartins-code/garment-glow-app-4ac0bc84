import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { toast } = useToast();

  const [items, setItems] = useState<ProductItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkToken = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("ml_tokens")
      .select("access_token")
      .eq("user_id", user.id)
      .maybeSingle();
    setHasToken(!!data?.access_token);
    return data?.access_token || null;
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await checkToken();
      if (!token) { setHasToken(false); return; }

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

      setItems(rawItems);
      setSummary(data.summary || null);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("ML inventory fetch error:", err);
      toast({ title: "Erro ao carregar dados", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, checkToken, toast]);

  // Initial token check
  useEffect(() => { checkToken(); }, [checkToken]);

  // Fetch once when token is confirmed, then auto-refresh
  useEffect(() => {
    if (!hasToken) return;
    if (items.length === 0 && !lastUpdated) {
      fetchData();
    }
    intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasToken, fetchData, items.length, lastUpdated]);

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
