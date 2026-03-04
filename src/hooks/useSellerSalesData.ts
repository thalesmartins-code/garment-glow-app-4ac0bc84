import { useMemo, useCallback } from "react";
import { useSalesData } from "@/contexts/SalesDataContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useSeller } from "@/contexts/SellerContext";
import { DailySale } from "@/data/mockData";
import { ALL_MARKETPLACES } from "@/types/seller";
import { getDaysInMonth, getDayOfWeek, dayOfWeekShortLabels } from "@/types/settings";

export interface CalculatedDailySale extends DailySale {
  isImported: boolean;
  isEdited?: boolean;
}

interface MarketplaceSummary {
  id: string;
  marketplace: string;
  logo: string;
  vendaTotal: number;
  vendaAprovadaReal: number;
  qtdVendas: number;
  ticketMedio: number;
  meta: number;
  metaPercentage: number;
  vendaAnoAnterior: number;
  yoyGrowth: number;
  hasImportedData: boolean;
}

interface UseSellerSalesDataReturn {
  getDailySalesData: (marketplace: string, year: number, month: number) => CalculatedDailySale[];
  getMarketplaceSummary: (year: number, month: number) => MarketplaceSummary[];
  getMarketplaceSummaryForDateRange: (startDate: Date, endDate: Date) => MarketplaceSummary[];
  updateSaleValue: (marketplace: string, year: number, month: number, day: number, vendaTotal: number) => void;
  updateSaleAprovadaReal: (marketplace: string, year: number, month: number, day: number, vendaAprovadaReal: number) => void;
  updateMarketplaceQuantity: (marketplaceId: string, year: number, month: number, qtdVendas: number) => void;
  getAvailableYears: () => number[];
  getAvailableMonths: (year: number) => number[];
  hasDataForPeriod: (year: number, month: number) => boolean;
  hasAnyData: (year: number, month: number) => boolean;
}

const diasSemana = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export function useSellerSalesData(): UseSellerSalesDataReturn {
  const { selectedSeller, getActiveMarketplaces } = useSeller();
  const { getSalesForMarketplace, getSalesForDay, getAvailableYears: getImportedYears, getAvailableMonths: getImportedMonths, updateSale, updateSaleField, hasImportedDataForSeller, getMarketplaceQuantity, updateMarketplaceQuantity: updateQuantityInContext } = useSalesData();
  const { getTarget } = useSettings();

  const activeMarketplaces = getActiveMarketplaces();

  // Get marketplace info by ID
  const getMarketplaceInfo = useCallback((marketplaceId: string) => {
    return ALL_MARKETPLACES.find((mp) => mp.id === marketplaceId);
  }, []);

  // Convert marketplace name to ID
  const getMarketplaceIdByName = useCallback((name: string): string | undefined => {
    const marketplace = ALL_MARKETPLACES.find(
      (mp) => mp.name.toLowerCase() === name.toLowerCase()
    );
    return marketplace?.id;
  }, []);

  // Get daily sales data for a specific marketplace and period
  const getDailySalesData = useCallback(
    (marketplaceId: string, year: number, month: number): CalculatedDailySale[] => {
      const sellerId = selectedSeller.id;
      const daysInMonth = getDaysInMonth(year, month);
      
      // Get marketplace info
      const marketplaceInfo = getMarketplaceInfo(marketplaceId);
      if (!marketplaceInfo) return [];

      // Get target configuration for this seller/marketplace/period
      const target = getTarget(sellerId, marketplaceId, year, month);
      const monthlyTarget = target?.targetValue ?? 0;
      const pmtDistribution = target?.pmtDistribution ?? [];

      // Get imported sales for this period - use the marketplace name
      const importedSales = getSalesForMarketplace(sellerId, marketplaceInfo.name, year, month);
      
      // Check if we have imported data
      const hasImported = importedSales.length > 0;

      // Generate daily data
      const dailySales: CalculatedDailySale[] = [];
      let pmtAcum = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const semana = diasSemana[dayOfWeek];

        // Get PMT for this day
        const pmtConfig = pmtDistribution.find((p) => p.day === day);
        const pmt = pmtConfig?.pmt ?? (100 / daysInMonth);
        pmtAcum += pmt;

        // Calculate daily target
        const metaVendas = monthlyTarget * (pmt / 100);

        // Get imported or mock data
        const importedDay = importedSales.find((s) => s.dia === day);
        
        let vendaTotal: number;
        let vendaAnoAnterior: number;
        let isImported = false;

        if (importedDay) {
          // Use imported data
          vendaTotal = importedDay.vendaTotal;
          isImported = true;
          
          // Use vendaAnoAnterior from imported data if available, otherwise try previous year
          if (importedDay.vendaAnoAnterior && importedDay.vendaAnoAnterior > 0) {
            vendaAnoAnterior = importedDay.vendaAnoAnterior;
          } else {
            const prevYearSale = getSalesForDay(sellerId, marketplaceInfo.name, year - 1, month, day);
            vendaAnoAnterior = prevYearSale?.vendaTotal ?? 0;
          }
        } else {
          // No imported data - show zeros
          vendaTotal = 0;
          vendaAnoAnterior = 0;
        }

        // Calculate derived metrics
        const gap = vendaTotal - metaVendas;
        const metaAtingida = metaVendas > 0 ? (vendaTotal / metaVendas) * 100 : 0;
        const yoyDia = vendaAnoAnterior > 0 ? ((vendaTotal - vendaAnoAnterior) / vendaAnoAnterior) * 100 : 0;

        dailySales.push({
          dia: day,
          semana,
          pmt: Math.round(pmt * 100) / 100,
          pmtAcum: Math.round(pmtAcum * 100) / 100,
          metaVendas: Math.round(metaVendas * 100) / 100,
          vendaTotal: Math.round(vendaTotal * 100) / 100,
          vendaAprovadaReal: Math.round((importedDay?.vendaAprovadaReal ?? 0) * 100) / 100,
          gap: Math.round(gap * 100) / 100,
          metaAtingida: Math.round(metaAtingida * 100) / 100,
          vendaAnoAnterior: Math.round(vendaAnoAnterior * 100) / 100,
          yoyDia: Math.round(yoyDia * 100) / 100,
          isImported,
        });
      }

      return dailySales;
    },
    [selectedSeller.id, getTarget, getSalesForMarketplace, getSalesForDay, getMarketplaceInfo]
  );

  // Get summary for all marketplaces
  const getMarketplaceSummary = useCallback(
    (year: number, month: number): MarketplaceSummary[] => {
      const sellerId = selectedSeller.id;
      
      return activeMarketplaces.map((mp) => {
        const dailyData = getDailySalesData(mp.id, year, month);
        const marketplaceInfo = getMarketplaceInfo(mp.id);
        
        const vendaTotal = dailyData.reduce((sum, d) => sum + d.vendaTotal, 0);
        const vendaAprovadaReal = dailyData.reduce((sum, d) => sum + d.vendaAprovadaReal, 0);
        const meta = dailyData.reduce((sum, d) => sum + d.metaVendas, 0);
        const vendaAnoAnterior = dailyData.reduce((sum, d) => sum + d.vendaAnoAnterior, 0);
        
        // Get stored quantity for this marketplace
        const qtdVendas = getMarketplaceQuantity(sellerId, marketplaceInfo?.name ?? mp.id, year, month);
        
        // Calculate ticket médio dynamically
        const ticketMedio = qtdVendas > 0 ? vendaTotal / qtdVendas : 0;
        
        const metaPercentage = meta > 0 ? (vendaTotal / meta) * 100 : 0;
        const yoyGrowth = vendaAnoAnterior > 0 ? ((vendaTotal - vendaAnoAnterior) / vendaAnoAnterior) * 100 : 0;

        const hasImportedData = dailyData.some((d) => d.isImported);

        return {
          id: mp.id,
          marketplace: marketplaceInfo?.name ?? mp.id,
          logo: marketplaceInfo?.logo ?? "📊",
          vendaTotal: Math.round(vendaTotal * 100) / 100,
          vendaAprovadaReal: Math.round(vendaAprovadaReal * 100) / 100,
          qtdVendas,
          ticketMedio: Math.round(ticketMedio * 100) / 100,
          meta: Math.round(meta * 100) / 100,
          metaPercentage: Math.round(metaPercentage * 100) / 100,
          vendaAnoAnterior: Math.round(vendaAnoAnterior * 100) / 100,
          yoyGrowth: Math.round(yoyGrowth * 100) / 100,
          hasImportedData,
        };
      });
    },
    [selectedSeller.id, activeMarketplaces, getDailySalesData, getMarketplaceInfo, getMarketplaceQuantity]
  );

  // Get marketplace summary filtered by a date range (aggregates across months)
  const getMarketplaceSummaryForDateRange = useCallback(
    (startDate: Date, endDate: Date): MarketplaceSummary[] => {
      const sellerId = selectedSeller.id;

      return activeMarketplaces.map((mp) => {
        const marketplaceInfo = getMarketplaceInfo(mp.id);
        let vendaTotal = 0;
        let vendaAprovadaReal = 0;
        let metaTotal = 0;
        let vendaAnoAnterior = 0;
        let totalQtd = 0;
        let hasImported = false;

        // Iterate months in range
        const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

        while (cursor <= endMonth) {
          const y = cursor.getFullYear();
          const m = cursor.getMonth() + 1;
          const dailyData = getDailySalesData(mp.id, y, m);

          for (const d of dailyData) {
            const dayDate = new Date(y, m - 1, d.dia);
            if (dayDate >= startDate && dayDate <= endDate) {
              vendaTotal += d.vendaTotal;
              vendaAprovadaReal += d.vendaAprovadaReal;
              metaTotal += d.metaVendas;
              vendaAnoAnterior += d.vendaAnoAnterior;
              if (d.isImported) hasImported = true;
            }
          }

          const qtd = getMarketplaceQuantity(sellerId, marketplaceInfo?.name ?? mp.id, y, m);
          totalQtd += qtd;

          cursor.setMonth(cursor.getMonth() + 1);
        }

        const ticketMedio = totalQtd > 0 ? vendaTotal / totalQtd : 0;
        const metaPercentage = metaTotal > 0 ? (vendaTotal / metaTotal) * 100 : 0;
        const yoyGrowth = vendaAnoAnterior > 0 ? ((vendaTotal - vendaAnoAnterior) / vendaAnoAnterior) * 100 : 0;

        return {
          id: mp.id,
          marketplace: marketplaceInfo?.name ?? mp.id,
          logo: marketplaceInfo?.logo ?? "📊",
          vendaTotal: Math.round(vendaTotal * 100) / 100,
          vendaAprovadaReal: Math.round(vendaAprovadaReal * 100) / 100,
          qtdVendas: totalQtd,
          ticketMedio: Math.round(ticketMedio * 100) / 100,
          meta: Math.round(metaTotal * 100) / 100,
          metaPercentage: Math.round(metaPercentage * 100) / 100,
          vendaAnoAnterior: Math.round(vendaAnoAnterior * 100) / 100,
          yoyGrowth: Math.round(yoyGrowth * 100) / 100,
          hasImportedData: hasImported,
        };
      });
    },
    [selectedSeller.id, activeMarketplaces, getDailySalesData, getMarketplaceInfo, getMarketplaceQuantity]
  );

  // Update a specific sale value
  const updateSaleValue = useCallback(
    (marketplaceId: string, year: number, month: number, day: number, vendaTotal: number) => {
      const marketplaceInfo = getMarketplaceInfo(marketplaceId);
      if (!marketplaceInfo) return;

      updateSale(selectedSeller.id, marketplaceInfo.name, year, month, day, vendaTotal);
    },
    [selectedSeller.id, updateSale, getMarketplaceInfo]
  );

  // Update vendaAprovadaReal for a specific day
  const updateSaleAprovadaReal = useCallback(
    (marketplaceId: string, year: number, month: number, day: number, vendaAprovadaReal: number) => {
      const marketplaceInfo = getMarketplaceInfo(marketplaceId);
      if (!marketplaceInfo) return;

      updateSaleField(selectedSeller.id, marketplaceInfo.name, year, month, day, 'vendaAprovadaReal', vendaAprovadaReal);
    },
    [selectedSeller.id, updateSaleField, getMarketplaceInfo]
  );

  // Update marketplace quantity
  const updateMarketplaceQuantity = useCallback(
    (marketplaceId: string, year: number, month: number, qtdVendas: number) => {
      const marketplaceInfo = getMarketplaceInfo(marketplaceId);
      if (!marketplaceInfo) return;

      updateQuantityInContext(selectedSeller.id, marketplaceInfo.name, year, month, qtdVendas);
    },
    [selectedSeller.id, updateQuantityInContext, getMarketplaceInfo]
  );

  // Get available years for the current seller
  const getAvailableYears = useCallback(() => {
    const importedYears = getImportedYears(selectedSeller.id);
    
    // Always include current year and next year as options
    const currentYear = new Date().getFullYear();
    const allYears = new Set([...importedYears, currentYear, currentYear + 1]);
    
    return Array.from(allYears).sort((a, b) => b - a);
  }, [selectedSeller.id, getImportedYears]);

  // Get available months for the current seller and year
  const getAvailableMonths = useCallback(
    (year: number) => {
      const importedMonths = getImportedMonths(selectedSeller.id, year);
      
      // If no imported data, return all months
      if (importedMonths.length === 0) {
        return Array.from({ length: 12 }, (_, i) => i + 1);
      }
      
      return importedMonths;
    },
    [selectedSeller.id, getImportedMonths]
  );

  // Check if there's data for a specific period
  const hasDataForPeriod = useCallback(
    (year: number, month: number) => {
      return hasImportedDataForSeller(selectedSeller.id);
    },
    [selectedSeller.id, hasImportedDataForSeller]
  );

  // Check if there's any imported data for a specific period
  const hasAnyData = useCallback(
    (year: number, month: number): boolean => {
      return activeMarketplaces.some(mp => {
        const marketplaceInfo = getMarketplaceInfo(mp.id);
        if (!marketplaceInfo) return false;
        
        const importedSales = getSalesForMarketplace(selectedSeller.id, marketplaceInfo.name, year, month);
        return importedSales.length > 0;
      });
    },
    [activeMarketplaces, selectedSeller.id, getSalesForMarketplace, getMarketplaceInfo]
  );

  return {
    getDailySalesData,
    getMarketplaceSummary,
    updateSaleValue,
    updateSaleAprovadaReal,
    updateMarketplaceQuantity,
    getAvailableYears,
    getAvailableMonths,
    hasDataForPeriod,
    hasAnyData,
  };
}
