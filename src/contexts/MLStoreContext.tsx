import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MLStore {
  ml_user_id: string;
  nickname: string | null;
  access_token: string;
}

interface MLStoreState {
  stores: MLStore[];
  selectedStore: string; // "all" or ml_user_id
  setSelectedStore: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const MLStoreContext = createContext<MLStoreState | null>(null);

export function MLStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stores, setStores] = useState<MLStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchStores = useCallback(async () => {
    if (!user) {
      setStores([]);
      setLoading(false);
      return;
    }

    try {
      // Get all tokens for this user
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

      // Get nicknames from cache
      const { data: userCaches } = await supabase
        .from("ml_user_cache")
        .select("ml_user_id, nickname")
        .eq("user_id", user.id);

      const nicknameMap: Record<string, string | null> = {};
      (userCaches || []).forEach((c) => {
        nicknameMap[String(c.ml_user_id)] = c.nickname;
      });

      const storeList: MLStore[] = tokens
        .filter((t) => t.ml_user_id)
        .map((t) => ({
          ml_user_id: t.ml_user_id!,
          nickname: nicknameMap[t.ml_user_id!] || null,
          access_token: t.access_token!,
        }));

      setStores(storeList);

      // If only one store, auto-select it
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
      value={{ stores, selectedStore, setSelectedStore, loading, refresh: fetchStores }}
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
