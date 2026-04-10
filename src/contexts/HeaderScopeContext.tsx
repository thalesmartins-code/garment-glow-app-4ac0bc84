import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSeller } from "@/contexts/SellerContext";

export interface ScopeToken {
  ml_user_id: string;
  access_token: string;
  seller_id: string | null;
}

interface HeaderScopeState {
  sellerId: string | null;
  storeId: string; // "all" or seller_stores.id
  setStoreId: (id: string) => void;
  resolvedMLUserIds: string[];
  scopeKey: string;
  hasMLConnection: boolean;
  tokens: ScopeToken[];
  loading: boolean;
  refreshTokens: () => Promise<void>;
}

const HeaderScopeContext = createContext<HeaderScopeState | null>(null);

export function HeaderScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { selectedSeller } = useSeller();
  const sellerId = selectedSeller?.id ?? null;

  const [storeId, setStoreIdRaw] = useState<string>("all");
  const [tokens, setTokens] = useState<ScopeToken[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset storeId when seller changes
  const prevSellerRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevSellerRef.current !== sellerId) {
      prevSellerRef.current = sellerId;
      const key = sellerId ? `scope_store_${sellerId}` : null;
      const saved = key ? localStorage.getItem(key) : null;
      setStoreIdRaw(saved ?? "all");
    }
  }, [sellerId]);

  const setStoreId = useCallback((id: string) => {
    setStoreIdRaw(id);
    if (sellerId) {
      localStorage.setItem(`scope_store_${sellerId}`, id);
    }
  }, [sellerId]);

  const fetchTokens = useCallback(async () => {
    if (!user || !sellerId) {
      setTokens([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("ml_tokens")
        .select("ml_user_id, access_token, seller_id")
        .eq("user_id", user.id)
        .eq("seller_id", sellerId)
        .not("access_token", "is", null);

      setTokens(
        (data || [])
          .filter((t) => t.ml_user_id && t.access_token)
          .map((t) => ({
            ml_user_id: t.ml_user_id!,
            access_token: t.access_token!,
            seller_id: t.seller_id,
          }))
      );
    } catch (err) {
      console.error("HeaderScope: failed to fetch tokens", err);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [user, sellerId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Resolve which ml_user_ids are active based on store selection
  const resolvedMLUserIds = useMemo(() => {
    if (tokens.length === 0) return [];

    if (storeId === "all") {
      return tokens.map((t) => t.ml_user_id);
    }

    // Find the seller_store and match by external_id
    const store = (selectedSeller?.stores ?? []).find((s) => s.id === storeId);
    if (!store?.external_id) return [];

    const matched = tokens.find((t) => t.ml_user_id === store.external_id);
    return matched ? [matched.ml_user_id] : [];
  }, [tokens, storeId, selectedSeller]);

  const hasMLConnection = tokens.length > 0;
  const scopeKey = `${sellerId ?? "none"}:${storeId}:${resolvedMLUserIds.sort().join(",")}`;

  return (
    <HeaderScopeContext.Provider
      value={{
        sellerId,
        storeId,
        setStoreId,
        resolvedMLUserIds,
        scopeKey,
        hasMLConnection,
        tokens,
        loading,
        refreshTokens: fetchTokens,
      }}
    >
      {children}
    </HeaderScopeContext.Provider>
  );
}

export function useHeaderScope() {
  const ctx = useContext(HeaderScopeContext);
  if (!ctx) throw new Error("useHeaderScope must be used within HeaderScopeProvider");
  return ctx;
}

export function useHeaderScopeSafe() {
  return useContext(HeaderScopeContext);
}
