import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Seller, DEFAULT_SELLERS, generateSellerId, generateInitials, ALL_MARKETPLACES } from "@/types/seller";

interface SellerContextType {
  sellers: Seller[];
  activeSellers: Seller[];
  selectedSeller: Seller;
  setSelectedSeller: (sellerId: string) => void;
  addSeller: (name: string, activeMarketplaces?: string[]) => Seller;
  updateSeller: (id: string, data: Partial<Omit<Seller, "id" | "createdAt">>) => void;
  toggleSellerActive: (id: string) => void;
  deleteSeller: (id: string) => boolean;
  getActiveMarketplaces: () => typeof ALL_MARKETPLACES;
  getMarketplaceById: (id: string) => typeof ALL_MARKETPLACES[number] | undefined;
}

const STORAGE_KEY = "sellers_data";
const STORAGE_VERSION_KEY = "sellers_data_version";
const CURRENT_VERSION = "2";
const SELECTED_SELLER_KEY = "selected_seller_id";

const SellerContext = createContext<SellerContextType | undefined>(undefined);

export function SellerProvider({ children }: { children: React.ReactNode }) {
  const [sellers, setSellers] = useState<Seller[]>(() => {
    try {
      const version = localStorage.getItem(STORAGE_VERSION_KEY);
      if (version !== CURRENT_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SELECTED_SELLER_KEY);
        localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
        return DEFAULT_SELLERS;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: Seller) => ({
            ...s,
            isActive: s.isActive !== undefined ? s.isActive : true,
          }));
        }
      }
    } catch (error) {
      console.error("Error loading sellers from localStorage:", error);
    }
    return DEFAULT_SELLERS;
  });

  const activeSellers = sellers.filter((s) => s.isActive);

  const [selectedSellerId, setSelectedSellerId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(SELECTED_SELLER_KEY);
      if (stored && sellers.some((s) => s.id === stored)) {
        return stored;
      }
    } catch (error) {
      console.error("Error loading selected seller:", error);
    }
    return sellers[0]?.id || DEFAULT_SELLERS[0].id;
  });

  // Persist sellers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sellers));
    } catch (error) {
      console.error("Error saving sellers to localStorage:", error);
    }
  }, [sellers]);

  // Persist selected seller
  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_SELLER_KEY, selectedSellerId);
    } catch (error) {
      console.error("Error saving selected seller:", error);
    }
  }, [selectedSellerId]);

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId) || sellers[0];

  const setSelectedSeller = useCallback((sellerId: string) => {
    if (sellers.some((s) => s.id === sellerId)) {
      setSelectedSellerId(sellerId);
    }
  }, [sellers]);

  const addSeller = useCallback((name: string, activeMarketplaces?: string[]): Seller => {
    const id = generateSellerId(name);
    const initials = generateInitials(name);
    
    // Check for duplicate ID
    let finalId = id;
    let counter = 1;
    while (sellers.some((s) => s.id === finalId)) {
      finalId = `${id}-${counter}`;
      counter++;
    }

    const newSeller: Seller = {
      id: finalId,
      name,
      initials,
      activeMarketplaces: activeMarketplaces || ALL_MARKETPLACES.map((m) => m.id),
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    setSellers((prev) => [...prev, newSeller]);
    return newSeller;
  }, [sellers]);

  const toggleSellerActive = useCallback((id: string) => {
    setSellers((prev) =>
      prev.map((seller) =>
        seller.id === id ? { ...seller, isActive: !seller.isActive } : seller
      )
    );
  }, []);

  const updateSeller = useCallback((id: string, data: Partial<Omit<Seller, "id" | "createdAt">>) => {
    setSellers((prev) =>
      prev.map((seller) => {
        if (seller.id !== id) return seller;
        
        const updated = { ...seller, ...data };
        
        // Update initials if name changed
        if (data.name && data.name !== seller.name) {
          updated.initials = generateInitials(data.name);
        }
        
        return updated;
      })
    );
  }, []);

  const deleteSeller = useCallback((id: string): boolean => {
    // Cannot delete if only one seller remains
    if (sellers.length <= 1) {
      return false;
    }

    setSellers((prev) => prev.filter((s) => s.id !== id));
    
    // If deleted seller was selected, select the first remaining
    if (selectedSellerId === id) {
      const remaining = sellers.filter((s) => s.id !== id);
      setSelectedSellerId(remaining[0]?.id);
    }

    return true;
  }, [sellers, selectedSellerId]);

  const getActiveMarketplaces = useCallback(() => {
    return ALL_MARKETPLACES.filter((mp) =>
      selectedSeller.activeMarketplaces.includes(mp.id)
    );
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
        addSeller,
        updateSeller,
        toggleSellerActive,
        deleteSeller,
        getActiveMarketplaces,
        getMarketplaceById,
      }}
    >
      {children}
    </SellerContext.Provider>
  );
}

export function useSeller() {
  const context = useContext(SellerContext);
  if (context === undefined) {
    throw new Error("useSeller must be used within a SellerProvider");
  }
  return context;
}
