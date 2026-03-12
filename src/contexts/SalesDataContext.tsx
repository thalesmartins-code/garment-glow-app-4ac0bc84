import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { ImportedSale, MarketplaceQuantity } from "@/types/import";
import { supabase } from "@/integrations/supabase/client";

export interface DuplicateInfo {
  marketplace: string;
  count: number;
  records: Array<{ ano: number; mes: number; dia: number }>;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicateCount: number;
  duplicatesByMarketplace: DuplicateInfo[];
  newRecordsOnly: ImportedSale[];
  duplicateRecords: ImportedSale[];
}

interface SalesDataContextType {
  salesData: ImportedSale[];
  importSales: (data: ImportedSale[], sellerId: string) => void;
  appendSales: (data: ImportedSale[], sellerId: string) => void;
  clearSales: (sellerId?: string) => void;
  deleteSale: (sellerId: string, marketplace: string, ano: number, mes: number, dia: number) => void;
  getSalesForMarketplace: (sellerId: string, marketplace: string, year: number, month: number) => ImportedSale[];
  getSalesForDay: (sellerId: string, marketplace: string, year: number, month: number, day: number) => ImportedSale | undefined;
  getAvailableYears: (sellerId: string) => number[];
  getAvailableMonths: (sellerId: string, year: number) => number[];
  getImportedDataForSeller: (sellerId: string) => ImportedSale[];
  hasImportedData: boolean;
  hasImportedDataForSeller: (sellerId: string) => boolean;
  updateSale: (sellerId: string, marketplace: string, ano: number, mes: number, dia: number, vendaTotal: number) => void;
  updateSaleField: (sellerId: string, marketplace: string, ano: number, mes: number, dia: number, field: string, value: number) => void;
  findDuplicates: (sellerId: string, newData: ImportedSale[]) => DuplicateCheckResult;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  lastSyncedAt: string | null;
  // Marketplace quantities
  getMarketplaceQuantity: (sellerId: string, marketplace: string, ano: number, mes: number) => number;
  updateMarketplaceQuantity: (sellerId: string, marketplace: string, ano: number, mes: number, qtdVendas: number) => void;
}

const QUANTITIES_STORAGE_KEY = "marketplace_quantities";
const LAST_SYNCED_KEY = "sales_last_synced_at";

const SalesDataContext = createContext<SalesDataContextType | undefined>(undefined);

export function SalesDataProvider({ children }: { children: React.ReactNode }) {
  const [salesData, setSalesData] = useState<ImportedSale[]>([]);
  const [marketplaceQuantities, setMarketplaceQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStorage.getItem(LAST_SYNCED_KEY));
  const hasLoadedRef = useRef(false);

  const loadFromDB = useCallback(async () => {
    try {
      setIsLoading(true);
      const allData: ImportedSale[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("sales_data")
          .select("*")
          .range(from, from + pageSize - 1);

        if (error) {
          console.error("Erro ao carregar dados do Supabase:", error.message, error.details);
          break;
        }
        if (!data || data.length === 0) break;
        console.log(`Carregados ${data.length} registros do Supabase (página ${from / pageSize + 1})`);

        const mapped = data.map((row) => ({
          sellerId: row.seller_id,
          marketplace: row.marketplace,
          ano: row.ano,
          mes: row.mes,
          dia: row.dia,
          vendaTotal: Number(row.venda_total),
          vendaAprovadaReal: row.venda_aprovada_real ? Number(row.venda_aprovada_real) : undefined,
          qtdVendas: row.qtd_vendas ? Number(row.qtd_vendas) : undefined,
          pmt: row.pmt ? Number(row.pmt) : undefined,
          metaVendas: row.meta_vendas ? Number(row.meta_vendas) : undefined,
          vendaAnoAnterior: row.venda_ano_anterior ? Number(row.venda_ano_anterior) : undefined,
        }));

        allData.push(...mapped);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      if (allData.length > 0) {
        setSalesData(allData);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load from Supabase on mount (once)
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadFromDB();
  }, [loadFromDB]);

  const refreshData = useCallback(async () => {
    await loadFromDB();
    const now = new Date().toLocaleString("pt-BR");
    setLastSyncedAt(now);
    localStorage.setItem(LAST_SYNCED_KEY, now);
  }, [loadFromDB]);

  // Load quantities from localStorage
  useEffect(() => {
    const storedQuantities = localStorage.getItem(QUANTITIES_STORAGE_KEY);
    if (storedQuantities) {
      try {
        setMarketplaceQuantities(JSON.parse(storedQuantities));
      } catch (error) {
        console.error("Erro ao carregar quantidades:", error);
      }
    }
  }, []);

  // Supabase is the source of truth — no localStorage persistence for sales

  // Save quantities to localStorage when they change
  useEffect(() => {
    if (Object.keys(marketplaceQuantities).length > 0) {
      localStorage.setItem(QUANTITIES_STORAGE_KEY, JSON.stringify(marketplaceQuantities));
    }
  }, [marketplaceQuantities]);

  const importSales = useCallback((data: ImportedSale[], sellerId: string) => {
    // Add sellerId to all imported data
    const dataWithSeller = data.map((sale) => ({ ...sale, sellerId }));
    
    setSalesData((prev) => {
      // Remove existing data for this seller, then add new
      const otherSellerData = prev.filter((s) => s.sellerId !== sellerId);
      return [...otherSellerData, ...dataWithSeller];
    });
  }, []);

  const appendSales = useCallback((data: ImportedSale[], sellerId: string) => {
    const dataWithSeller = data.map((sale) => ({ ...sale, sellerId }));
    
    setSalesData((prev) => {
      // Merge new data, replacing duplicates (same seller + marketplace + date)
      const merged = [...prev];
      dataWithSeller.forEach((newSale) => {
        const existingIndex = merged.findIndex(
          (s) =>
            s.sellerId === newSale.sellerId &&
            s.marketplace === newSale.marketplace &&
            s.ano === newSale.ano &&
            s.mes === newSale.mes &&
            s.dia === newSale.dia
        );
        if (existingIndex >= 0) {
          merged[existingIndex] = newSale;
        } else {
          merged.push(newSale);
        }
      });
      return merged;
    });
  }, []);

  const clearSales = useCallback((sellerId?: string) => {
    if (sellerId) {
      setSalesData((prev) => prev.filter((s) => s.sellerId !== sellerId));
    } else {
      setSalesData([]);
      // cleared in memory; DB managed separately
    }
  }, []);

  const deleteSale = useCallback(
    (sellerId: string, marketplace: string, ano: number, mes: number, dia: number) => {
      setSalesData((prev) =>
        prev.filter(
          (s) =>
            !(
              s.sellerId === sellerId &&
              s.marketplace === marketplace &&
              s.ano === ano &&
              s.mes === mes &&
              s.dia === dia
            )
        )
      );
    },
    []
  );

  const getSalesForMarketplace = useCallback(
    (sellerId: string, marketplace: string, year: number, month: number) => {
      return salesData.filter(
        (s) => s.sellerId === sellerId && s.marketplace === marketplace && s.ano === year && s.mes === month
      );
    },
    [salesData]
  );

  const getSalesForDay = useCallback(
    (sellerId: string, marketplace: string, year: number, month: number, day: number) => {
      return salesData.find(
        (s) =>
          s.sellerId === sellerId &&
          s.marketplace === marketplace &&
          s.ano === year &&
          s.mes === month &&
          s.dia === day
      );
    },
    [salesData]
  );

  const getAvailableYears = useCallback((sellerId: string) => {
    const years = [...new Set(salesData.filter((s) => s.sellerId === sellerId).map((s) => s.ano))];
    return years.sort((a, b) => b - a);
  }, [salesData]);

  const getAvailableMonths = useCallback(
    (sellerId: string, year: number) => {
      const months = [
        ...new Set(salesData.filter((s) => s.sellerId === sellerId && s.ano === year).map((s) => s.mes)),
      ];
      return months.sort((a, b) => a - b);
    },
    [salesData]
  );

  const getImportedDataForSeller = useCallback(
    (sellerId: string) => {
      return salesData.filter((s) => s.sellerId === sellerId);
    },
    [salesData]
  );

  const hasImportedDataForSeller = useCallback(
    (sellerId: string) => {
      return salesData.some((s) => s.sellerId === sellerId);
    },
    [salesData]
  );

  const updateSale = useCallback(
    (sellerId: string, marketplace: string, ano: number, mes: number, dia: number, vendaTotal: number) => {
      setSalesData((prev) => {
        const existingIndex = prev.findIndex(
          (s) =>
            s.sellerId === sellerId &&
            s.marketplace === marketplace &&
            s.ano === ano &&
            s.mes === mes &&
            s.dia === dia
        );

        if (existingIndex >= 0) {
          // Update existing record
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], vendaTotal };
          return updated;
        } else {
          // Create new record
          return [...prev, { sellerId, marketplace, ano, mes, dia, vendaTotal }];
        }
      });
    },
    []
  );

  // Update a specific field on a sale record
  const updateSaleField = useCallback(
    (sellerId: string, marketplace: string, ano: number, mes: number, dia: number, field: string, value: number) => {
      setSalesData((prev) => {
        const existingIndex = prev.findIndex(
          (s) =>
            s.sellerId === sellerId &&
            s.marketplace === marketplace &&
            s.ano === ano &&
            s.mes === mes &&
            s.dia === dia
        );

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], [field]: value };
          return updated;
        } else {
          return [...prev, { sellerId, marketplace, ano, mes, dia, vendaTotal: 0, [field]: value }];
        }
      });
    },
    []
  );

  // Find duplicates between new data and existing data
  const findDuplicates = useCallback(
    (sellerId: string, newData: ImportedSale[]): DuplicateCheckResult => {
      const existingData = salesData.filter((s) => s.sellerId === sellerId);

      const duplicates: ImportedSale[] = [];
      const newOnly: ImportedSale[] = [];

      newData.forEach((newRecord) => {
        const isDuplicate = existingData.some(
          (existing) =>
            existing.marketplace === newRecord.marketplace &&
            existing.ano === newRecord.ano &&
            existing.mes === newRecord.mes &&
            existing.dia === newRecord.dia
        );

        if (isDuplicate) {
          duplicates.push(newRecord);
        } else {
          newOnly.push(newRecord);
        }
      });

      // Group by marketplace
      const byMarketplace = duplicates.reduce((acc, record) => {
        if (!acc[record.marketplace]) {
          acc[record.marketplace] = { marketplace: record.marketplace, count: 0, records: [] };
        }
        acc[record.marketplace].count++;
        acc[record.marketplace].records.push({
          ano: record.ano,
          mes: record.mes,
          dia: record.dia,
        });
        return acc;
      }, {} as Record<string, DuplicateInfo>);

      return {
        hasDuplicates: duplicates.length > 0,
        duplicateCount: duplicates.length,
        duplicatesByMarketplace: Object.values(byMarketplace),
        newRecordsOnly: newOnly,
        duplicateRecords: duplicates,
      };
    },
    [salesData]
  );

  // Get marketplace quantity for a specific period
  const getMarketplaceQuantity = useCallback(
    (sellerId: string, marketplace: string, ano: number, mes: number): number => {
      const key = `${sellerId}_${marketplace}_${ano}_${mes}`;
      return marketplaceQuantities[key] ?? 0;
    },
    [marketplaceQuantities]
  );

  // Update marketplace quantity for a specific period
  const updateMarketplaceQuantity = useCallback(
    (sellerId: string, marketplace: string, ano: number, mes: number, qtdVendas: number) => {
      const key = `${sellerId}_${marketplace}_${ano}_${mes}`;
      setMarketplaceQuantities((prev) => ({
        ...prev,
        [key]: qtdVendas,
      }));
    },
    []
  );

  return (
    <SalesDataContext.Provider
      value={{
        salesData,
        importSales,
        appendSales,
        clearSales,
        deleteSale,
        getSalesForMarketplace,
        getSalesForDay,
        getAvailableYears,
        getAvailableMonths,
        getImportedDataForSeller,
        hasImportedData: salesData.length > 0,
        hasImportedDataForSeller,
        updateSale,
        updateSaleField,
        findDuplicates,
        isLoading,
        refreshData,
        lastSyncedAt,
        getMarketplaceQuantity,
        updateMarketplaceQuantity,
      }}
    >
      {children}
    </SalesDataContext.Provider>
  );
}

export function useSalesData() {
  const context = useContext(SalesDataContext);
  if (context === undefined) {
    throw new Error("useSalesData deve ser usado dentro de um SalesDataProvider");
  }
  return context;
}
