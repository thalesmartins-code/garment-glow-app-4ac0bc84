import { useState, useMemo, useCallback } from "react";
import { DollarSign, Target, TrendingUp, Percent, Calculator, AlertTriangle, Calendar, Star, CalendarDays, RefreshCw, Loader2 } from "lucide-react";
import { DailySalesTable } from "@/components/dashboard/DailySalesTable";
import { DailySalesChart } from "@/components/dashboard/DailySalesChart";
import { KPICard } from "@/components/dashboard/KPICard";
import { Button } from "@/components/ui/button";
import { useSeller } from "@/contexts/SellerContext";
import { useSalesData } from "@/contexts/SalesDataContext";
import { useSellerSalesData, CalculatedDailySale } from "@/hooks/useSellerSalesData";
import { useSyncAndImport } from "@/hooks/useSyncAndImport";
import { DailySale } from "@/data/mockData";

const DailySales = () => {
  const { selectedSeller, getActiveMarketplaces } = useSeller();
  const { isLoading } = useSalesData();
  const { 
    getDailySalesData, 
    updateSaleValue, 
    updateSaleAprovadaReal,
    getAvailableYears, 
    getAvailableMonths 
  } = useSellerSalesData();
  const { syncAndImport, isSyncing } = useSyncAndImport();

  const currentDate = new Date();
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Get marketplaces available for this seller
  const activeMarketplaces = getActiveMarketplaces();
  
  const marketplaceOptions = useMemo(() => {
    const options = [{ value: "all", label: "Todos", logo: "📊" }];
    activeMarketplaces.forEach((mp) => {
      options.push({
        value: mp.id,
        label: mp.name,
        logo: mp.logo ?? "📦",
      });
    });
    return options;
  }, [activeMarketplaces]);

  // Get available years and months
  const availableYears = useMemo(() => getAvailableYears(), [getAvailableYears]);
  const availableMonths = useMemo(() => getAvailableMonths(selectedYear), [getAvailableMonths, selectedYear]);

  // Reset marketplace selection if current selection is not available for seller
  useMemo(() => {
    if (selectedMarketplace !== "all" && !activeMarketplaces.some((m) => m.id === selectedMarketplace)) {
      setSelectedMarketplace("all");
    }
  }, [activeMarketplaces, selectedMarketplace]);

  const handleRefresh = useCallback(async () => {
    const spreadsheetId = localStorage.getItem("google_spreadsheet_id") || "";
    if (spreadsheetId) {
      await syncAndImport(spreadsheetId, selectedSeller.id);
    }
    setLastUpdate(new Date());
  }, [syncAndImport, selectedSeller]);

  const formatLastUpdate = (date: Date) => {
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Get daily sales data for the selected marketplace and period
  const dailySalesData = useMemo((): CalculatedDailySale[] => {
    if (selectedMarketplace === "all") {
      // Aggregate data from all active marketplaces
      const allData: Record<number, CalculatedDailySale> = {};
      
      activeMarketplaces.forEach((mp) => {
        const mpData = getDailySalesData(mp.id, selectedYear, selectedMonth);
        mpData.forEach((day) => {
          if (!allData[day.dia]) {
            allData[day.dia] = {
              ...day,
              metaVendas: 0,
              vendaTotal: 0,
              vendaAprovadaReal: 0,
              vendaAnoAnterior: 0,
              gap: 0,
              metaAtingida: 0,
              yoyDia: 0,
              isImported: false,
            };
          }
          allData[day.dia].metaVendas += day.metaVendas;
          allData[day.dia].vendaTotal += day.vendaTotal;
          allData[day.dia].vendaAprovadaReal += day.vendaAprovadaReal;
          allData[day.dia].vendaAnoAnterior += day.vendaAnoAnterior;
          allData[day.dia].pmt = (allData[day.dia].pmt || 0) + day.pmt;
          allData[day.dia].pmtAcum = (allData[day.dia].pmtAcum || 0) + day.pmtAcum;
          allData[day.dia].isImported = allData[day.dia].isImported || day.isImported;
        });
      });

      // Recalculate derived fields and normalize PMT values
      const numMarketplaces = activeMarketplaces.length || 1;
      return Object.values(allData).map((day) => ({
        ...day,
        pmt: Math.round((day.pmt / numMarketplaces) * 100) / 100,
        pmtAcum: Math.round((day.pmtAcum / numMarketplaces) * 100) / 100,
        gap: Math.round((day.vendaTotal - day.metaVendas) * 100) / 100,
        metaAtingida: day.metaVendas > 0 ? Math.round((day.vendaTotal / day.metaVendas) * 100 * 100) / 100 : 0,
        yoyDia: day.vendaAnoAnterior > 0 ? Math.round(((day.vendaTotal - day.vendaAnoAnterior) / day.vendaAnoAnterior) * 100 * 100) / 100 : 0,
      })).sort((a, b) => a.dia - b.dia);
    }
    
    return getDailySalesData(selectedMarketplace, selectedYear, selectedMonth);
  }, [selectedMarketplace, selectedYear, selectedMonth, activeMarketplaces, getDailySalesData]);

  // Calculate metrics from daily sales data
  const metrics = useMemo(() => {
    const data = dailySalesData;
    
    if (data.length === 0) {
      return {
        metaTotal: 0,
        vendaTotal: 0,
        metaPercentage: 0,
        yoy: 0,
        mediaVendas: 0,
        gapTotal: 0,
        melhorDia: { dia: 0, valor: 0 },
        totalAnoAnterior: 0,
      };
    }

    const metaTotal = data.reduce((sum, day) => sum + day.metaVendas, 0);
    const vendaTotal = data.reduce((sum, day) => sum + day.vendaTotal, 0);
    const totalAnoAnterior = data.reduce((sum, day) => sum + day.vendaAnoAnterior, 0);
    const gapTotal = data.reduce((sum, day) => sum + day.gap, 0);
    const metaPercentage = metaTotal > 0 ? (vendaTotal / metaTotal) * 100 : 0;
    const yoy = totalAnoAnterior > 0 ? ((vendaTotal - totalAnoAnterior) / totalAnoAnterior) * 100 : 0;
    const mediaVendas = data.length > 0 ? vendaTotal / data.length : 0;
    
    // Find best day
    const melhorDiaData = data.reduce((best, day) => 
      day.vendaTotal > best.vendaTotal ? day : best, data[0]);
    const melhorDia = { dia: melhorDiaData.dia, valor: melhorDiaData.vendaTotal };

    return {
      metaTotal,
      vendaTotal,
      metaPercentage,
      yoy,
      mediaVendas,
      gapTotal,
      melhorDia,
      totalAnoAnterior,
    };
  }, [dailySalesData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleUpdateSale = useCallback((day: number, vendaTotal: number) => {
    if (selectedMarketplace !== "all") {
      updateSaleValue(selectedMarketplace, selectedYear, selectedMonth, day, vendaTotal);
    }
  }, [selectedMarketplace, selectedYear, selectedMonth, updateSaleValue]);

  const handleUpdateSaleAprovadaReal = useCallback((day: number, vendaAprovadaReal: number) => {
    if (selectedMarketplace !== "all") {
      updateSaleAprovadaReal(selectedMarketplace, selectedYear, selectedMonth, day, vendaAprovadaReal);
    }
  }, [selectedMarketplace, selectedYear, selectedMonth, updateSaleAprovadaReal]);

  const selectedMarketplaceLabel = marketplaceOptions.find(mp => mp.value === selectedMarketplace);

  // Convert CalculatedDailySale to DailySale for chart (remove isImported property)
  const chartData: DailySale[] = useMemo(() => {
    return dailySalesData.map(({ isImported, ...rest }) => rest as DailySale);
  }, [dailySalesData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex items-center justify-end gap-3">
          <span className="text-xs text-muted-foreground">
            Atualizado: {formatLastUpdate(lastUpdate)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Atualizar"}
          </Button>
        </div>

        {/* KPI Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Venda bruta aprovada"
            value={formatCurrency(metrics.vendaTotal)}
            rawValue={metrics.vendaTotal}
            valuePrefix="R$ "
            delta={metrics.yoy}
            deltaLabel="vs ano anterior"
            icon={<DollarSign className="w-5 h-5" />}
          />
          <KPICard
            title="Meta do mês"
            value={formatCurrency(metrics.metaTotal)}
            rawValue={metrics.metaTotal}
            valuePrefix="R$ "
            icon={<Target className="w-5 h-5" />}
          />
          <KPICard
            title="% da meta"
            value={`${metrics.metaPercentage.toFixed(1)}%`}
            rawValue={metrics.metaPercentage}
            valueSuffix="%"
            valueDecimals={1}
            icon={<Percent className="w-5 h-5" />}
          />
          <KPICard
            title="GAP"
            value={formatCurrency(Math.abs(metrics.gapTotal))}
            rawValue={Math.abs(metrics.gapTotal)}
            valuePrefix={metrics.gapTotal >= 0 ? "R$ +" : "R$ -"}
            delta={metrics.metaTotal > 0 ? (metrics.gapTotal >= 0 ? Math.abs(metrics.gapTotal / metrics.metaTotal * 100) : -Math.abs(metrics.gapTotal / metrics.metaTotal * 100)) : 0}
            deltaLabel={metrics.gapTotal >= 0 ? "acima da meta" : "abaixo da meta"}
            icon={<AlertTriangle className="w-5 h-5" />}
          />
        </div>

        {/* KPI Cards - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Melhor dia"
            value={`Dia ${metrics.melhorDia.dia}`}
            rawValue={metrics.melhorDia.dia}
            valuePrefix="Dia "
            subtitle={formatCurrency(metrics.melhorDia.valor)}
            icon={<Star className="w-5 h-5" />}
          />
          <KPICard
            title="Média diária"
            value={formatCurrency(metrics.mediaVendas)}
            rawValue={metrics.mediaVendas}
            valuePrefix="R$ "
            icon={<Calculator className="w-5 h-5" />}
          />
          <KPICard
            title="Total ano anterior"
            value={formatCurrency(metrics.totalAnoAnterior)}
            rawValue={metrics.totalAnoAnterior}
            valuePrefix="R$ "
            icon={<Calendar className="w-5 h-5" />}
          />
          <KPICard
            title="% YoY"
            value={`${metrics.yoy >= 0 ? "+" : ""}${metrics.yoy.toFixed(1)}%`}
            rawValue={Math.abs(metrics.yoy)}
            delta={metrics.yoy}
            deltaLabel="crescimento"
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </div>

        {/* Daily Sales Chart */}
        <DailySalesChart 
          data={chartData} 
          selectedMarketplace={selectedMarketplace} 
        />

        {/* Daily Sales Table */}
        <DailySalesTable 
          dailySalesData={dailySalesData}
          loading={false}
          selectedMarketplace={selectedMarketplace}
          onMarketplaceChange={setSelectedMarketplace}
          marketplaceOptions={marketplaceOptions}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          availableMonths={availableMonths}
          availableYears={availableYears}
          onUpdateSale={handleUpdateSale}
          onUpdateSaleAprovadaReal={handleUpdateSaleAprovadaReal}
          isEditable={selectedMarketplace !== "all"}
        />

        {/* Footer */}
        <footer className="text-center py-6 text-sm text-muted-foreground">
          <p>
            Dashboard Executivo de Vendas • Dados atualizados em tempo real
          </p>
        </footer>
    </div>
  );
};

export default DailySales;
