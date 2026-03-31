import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Seller, SellerStore, ALL_MARKETPLACES, buildSeller, generateInitials } from "@/types/seller";

interface AddStoreInput {
  marketplace: string;
  store_name: string;
  external_id?: string;
}

interface SellerContextType {
  sellers: Seller[];
  activeSellers: Seller[];
  selectedSeller: Seller | null;
  setSelectedSeller: (sellerId: string) => void;
  loading: boolean;
  // Seller CRUD
  addSeller: (name: string) => Promise<Seller | null>;
  updateSeller: (id: string, data: { name?: string; is_active?: boolean; logo_url?: string | null }) => Promise<void>;
  deleteSeller: (id: string) => Promise<boolean>;
  // Store CRUD
  addStore: (sellerId: string, input: AddStoreInput) => Promise<SellerStore | null>;
  updateStore: (storeId: string, data: { store_name?: string; external_id?: string; is_active?: boolean }) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
  // Legacy helpers
  getActiveMarketplaces: () => typeof ALL_MARKETPLACES[number][];
  getMarketplaceById: (id: string) => typeof ALL_MARKETPLACES[number] | undefined;
  // Legacy mutation kept for Sellers.tsx compat
  toggleSellerActive: (id: string) => Promise<void>;
}

const SELECTED_SELLER_KEY = "selected_seller_id_v3";

const SellerContext = createContext<SellerContextType | undefined>(undefined);

export function SellerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_SELLER_KEY)
  );
  const loadedRef = useRef(false);

  const loadSellers = useCallback(async () => {
    if (!user) {
      setSellers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data: sellerRows }, { data: storeRows }] = await Promise.all([
        supabase
          .from("sellers" as any)
          .select("id, name, initials, logo_url, is_active, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("seller_stores" as any)
          .select("id, seller_id, marketplace, store_name, external_id, is_active, created_at")
          .order("created_at", { ascending: true }),
      ]);

      const storesBySeller: Record<string, SellerStore[]> = {};
      for (const s of (storeRows as any[]) || []) {
        if (!storesBySeller[s.seller_id]) storesBySeller[s.seller_id] = [];
        storesBySeller[s.seller_id].push(s as SellerStore);
      }

      const built = ((sellerRows as any[]) || []).map((row) =>
        buildSeller(row, storesBySeller[row.id] || [])
      );

      setSellers(built);
    } catch (err) {
      console.error("Failed to load sellers:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadSellers();
    }
  }, [loadSellers]);

  // Re-load when user changes
  useEffect(() => {
    loadedRef.current = false;
    loadSellers();
  }, [user?.id]);

  // Persist selected seller id
  useEffect(() => {
    if (selectedSellerId) {
      localStorage.setItem(SELECTED_SELLER_KEY, selectedSellerId);
    }
  }, [selectedSellerId]);

  const activeSellers = sellers.filter((s) => s.is_active);

  const selectedSeller: Seller | null =
    sellers.find((s) => s.id === selectedSellerId) ??
    activeSellers[0] ??
    sellers[0] ??
    null;

  const setSelectedSeller = useCallback((sellerId: string) => {
    setSelectedSellerId(sellerId);
  }, []);

  const addSeller = useCallback(async (name: string): Promise<Seller | null> => {
    if (!user) return null;
    const initials = generateInitials(name);
    const { data, error } = await supabase
      .from("sellers" as any)
      .insert({ user_id: user.id, name, initials, is_active: true })
      .select()
      .single();
    if (error || !data) { console.error(error); return null; }
    const newSeller = buildSeller(data as any, []);
    setSellers((prev) => [...prev, newSeller]);
    return newSeller;
  }, [user]);

  const updateSeller = useCallback(async (id: string, data: { name?: string; is_active?: boolean; logo_url?: string | null }) => {
    const updates: any = { ...data };
    if (data.name) updates.initials = generateInitials(data.name);
    const { error } = await supabase.from("sellers" as any).update(updates).eq("id", id);
    if (error) { console.error(error); return; }
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return buildSeller(
          { ...s, ...updates, is_active: data.is_active ?? s.is_active },
          s.stores
        );
      })
    );
  }, []);

  const toggleSellerActive = useCallback(async (id: string) => {
    const seller = sellers.find((s) => s.id === id);
    if (!seller) return;
    await updateSeller(id, { is_active: !seller.is_active });
  }, [sellers, updateSeller]);

  const deleteSeller = useCallback(async (id: string): Promise<boolean> => {
    if (sellers.length <= 1) return false;
    const { error } = await supabase.from("sellers" as any).delete().eq("id", id);
    if (error) { console.error(error); return false; }
    setSellers((prev) => prev.filter((s) => s.id !== id));
    if (selectedSellerId === id) {
      const remaining = sellers.filter((s) => s.id !== id);
      setSelectedSellerId(remaining[0]?.id ?? null);
    }
    return true;
  }, [sellers, selectedSellerId]);

  const addStore = useCallback(async (sellerId: string, input: AddStoreInput): Promise<SellerStore | null> => {
    const { data, error } = await supabase
      .from("seller_stores" as any)
      .insert({
        seller_id: sellerId,
        marketplace: input.marketplace,
        store_name: input.store_name,
        external_id: input.external_id ?? null,
        is_active: true,
      })
      .select()
      .single();
    if (error || !data) { console.error(error); return null; }
    const newStore = data as unknown as SellerStore;
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id !== sellerId) return s;
        return buildSeller({ ...s }, [...s.stores, newStore]);
      })
    );
    return newStore;
  }, []);

  const updateStore = useCallback(async (
    storeId: string,
    data: { store_name?: string; external_id?: string; is_active?: boolean }
  ) => {
    const { error } = await supabase.from("seller_stores" as any).update(data).eq("id", storeId);
    if (error) { console.error(error); return; }
    setSellers((prev) =>
      prev.map((s) => {
        const storeIdx = s.stores.findIndex((st) => st.id === storeId);
        if (storeIdx === -1) return s;
        const updatedStores = s.stores.map((st) =>
          st.id === storeId ? { ...st, ...data } : st
        );
        return buildSeller({ ...s }, updatedStores);
      })
    );
  }, []);

  const deleteStore = useCallback(async (storeId: string) => {
    const { error } = await supabase.from("seller_stores" as any).delete().eq("id", storeId);
    if (error) { console.error(error); return; }
    setSellers((prev) =>
      prev.map((s) => {
        const has = s.stores.some((st) => st.id === storeId);
        if (!has) return s;
        return buildSeller({ ...s }, s.stores.filter((st) => st.id !== storeId));
      })
    );
  }, []);

  const getActiveMarketplaces = useCallback(() => {
    const mpIds = new Set(selectedSeller?.stores.map((s) => s.marketplace) ?? []);
    return ALL_MARKETPLACES.filter((mp) => mpIds.has(mp.id));
  }, [selectedSeller]);

  const getMarketplaceById = useCallback((id: string) => {
    return ALL_MARKETPLACES.find((mp) => mp.id === id);
  }, []);

  return (
    <SellerContext.Provider
      value={{
        sellers,
        activeSellers,
        selectedSeller,
        setSelectedSeller,
        loading,
        addSeller,
        updateSeller,
        deleteSeller,
        addStore,
        updateStore,
        deleteStore,
        getActiveMarketplaces,
        getMarketplaceById,
        toggleSellerActive,
      }}
    >
      {children}
    </SellerContext.Provider>
  );
}

export function useSeller() {
  const context = useContext(SellerContext);
  if (context === undefined) throw new Error("useSeller must be used within a SellerProvider");
  return context;
}
