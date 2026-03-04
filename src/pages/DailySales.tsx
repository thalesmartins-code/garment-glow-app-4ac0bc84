import { useState, useMemo, useCallback } from "react";
import { DollarSign, Target, TrendingUp, Percent, Calculator, AlertTriangle, Calendar, Star, CalendarDays, RefreshCw, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DailySalesTable } from "@/components/dashboard/DailySalesTable";
import { DailySalesChart } from "@/components/dashboard/DailySalesChart";
import { KPICard } from "@/components/dashboard/KPICard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [viewMode, setViewMode] = useState<"diario" | "mensal">("mensal");
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

  // Check if selected period is current month
  const isCurrentMonth = selectedYear === currentDate.getFullYear() && selectedMonth === (currentDate.getMonth() + 1);

  // Auto-switch to mensal when not current month
  useMemo(() => {
    if (!isCurrentMonth && viewMode === "diario") {
      setViewMode("mensal");
    }
  }, [isCurrentMonth, viewMode]);

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

  // Calculate metrics from daily sales data (monthly)
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
    
    const melhorDiaData = data.reduce((best, day) => 
      day.vendaTotal > best.vendaTotal ? day : best, data[0]);
    const melhorDia = { dia: melhorDiaData.dia, valor: melhorDiaData.vendaTotal };

    return { metaTotal, vendaTotal, metaPercentage, yoy, mediaVendas, gapTotal, melhorDia, totalAnoAnterior };
  }, [dailySalesData]);

  // Calculate metrics for today (daily view)
  const dailyMetrics = useMemo(() => {
    const yesterday = currentDate.getDate() - 1;
    const dayData = isCurrentMonth && yesterday > 0
      ? dailySalesData.find((d) => d.dia === yesterday)
      : null;

    if (!dayData) {
      return {
        vendaTotal: 0, metaVendas: 0, metaPercentage: 0, gap: 0,
        vendaAnoAnterior: 0, yoy: 0, dia: yesterday || 1,
      };
    }

    return {
      vendaTotal: dayData.vendaTotal,
      metaVendas: dayData.metaVendas,
      metaPercentage: dayData.metaAtingida,
      gap: dayData.gap,
      vendaAnoAnterior: dayData.vendaAnoAnterior,
      yoy: dayData.yoyDia,
      dia: dayData.dia,
    };
  }, [dailySalesData, selectedYear, selectedMonth, currentDate]);

  // Active metrics based on viewMode
  const activeMetrics = viewMode === "diario" ? {
    vendaTotal: dailyMetrics.vendaTotal,
    metaTotal: dailyMetrics.metaVendas,
    metaPercentage: dailyMetrics.metaPercentage,
    gapTotal: dailyMetrics.gap,
    yoy: dailyMetrics.yoy,
    totalAnoAnterior: dailyMetrics.vendaAnoAnterior,
    mediaVendas: metrics.mediaVendas,
    melhorDia: metrics.melhorDia,
  } : metrics;

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
        {/* Sync Progress Bar */}
        {isSyncing && (
          <div className="w-full">
            <Progress value={undefined} className="h-1 w-full [&>div]:animate-[indeterminate_1.5s_ease-in-out_infinite] [&>div]:w-1/3" />
          </div>
        )}
        {/* Filter Bar */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "diario" | "mensal")}>
                <TabsList className="h-9">
                  <TabsTrigger value="diario" className="text-sm px-3 py-1.5" disabled={!isCurrentMonth}>Diário</TabsTrigger>
                  <TabsTrigger value="mensal" className="text-sm px-3 py-1.5">Mensal</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <SelectValue>
                    {selectedMarketplaceLabel && (
                      <span className="flex items-center gap-1.5">
                        <span>{selectedMarketplaceLabel.logo}</span>
                        <span>{selectedMarketplaceLabel.label}</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {marketplaceOptions.map((mp) => (
                    <SelectItem key={mp.value} value={mp.value}>
                      <span className="flex items-center gap-1.5">
                        <span>{mp.logo}</span>
                        <span>{mp.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {new Date(2000, m - 1).toLocaleString("pt-BR", { month: "long" }).replace(/^\w/, c => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[90px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden lg:inline">
                {formatLastUpdate(lastUpdate)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isSyncing}
                className="gap-1.5 h-9 text-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Sync..." : "Atualizar"}
              </Button>
            </div>
          </div>
        </Card>

        {/* KPI Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title={viewMode === "diario" ? "Venda bruta aprovada (Hoje)" : "Venda bruta aprovada"}
            value={formatCurrency(activeMetrics.vendaTotal)}
            rawValue={activeMetrics.vendaTotal}
            valuePrefix="R$ "
            delta={activeMetrics.yoy}
            deltaLabel="vs ano anterior"
            icon={<DollarSign className="w-5 h-5" />}
          />
          <KPICard
            title={viewMode === "diario" ? "Meta do dia" : "Meta do mês"}
            value={formatCurrency(activeMetrics.metaTotal)}
            rawValue={activeMetrics.metaTotal}
            valuePrefix="R$ "
            icon={<Target className="w-5 h-5" />}
          />
          <KPICard
            title={viewMode === "diario" ? "% da meta (Dia)" : "% da meta"}
            value={`${activeMetrics.metaPercentage.toFixed(1)}%`}
            rawValue={activeMetrics.metaPercentage}
            valueSuffix="%"
            valueDecimals={1}
            icon={<Percent className="w-5 h-5" />}
          />
        </div>

        {/* KPI Cards - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title={viewMode === "diario" ? "GAP (Dia)" : "GAP"}
            value={formatCurrency(Math.abs(activeMetrics.gapTotal))}
            rawValue={Math.abs(activeMetrics.gapTotal)}
            valuePrefix={activeMetrics.gapTotal >= 0 ? "R$ +" : "R$ -"}
            delta={activeMetrics.metaTotal > 0 ? (activeMetrics.gapTotal >= 0 ? Math.abs(activeMetrics.gapTotal / activeMetrics.metaTotal * 100) : -Math.abs(activeMetrics.gapTotal / activeMetrics.metaTotal * 100)) : 0}
            deltaLabel={activeMetrics.gapTotal >= 0 ? "acima da meta" : "abaixo da meta"}
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <KPICard
            title={viewMode === "diario" ? "Ano anterior (Dia)" : "Total ano anterior"}
            value={formatCurrency(activeMetrics.totalAnoAnterior)}
            rawValue={activeMetrics.totalAnoAnterior}
            valuePrefix="R$ "
            icon={<Calendar className="w-5 h-5" />}
          />
          <KPICard
            title="% YoY"
            value={`${activeMetrics.yoy >= 0 ? "+" : ""}${activeMetrics.yoy.toFixed(1)}%`}
            rawValue={Math.abs(activeMetrics.yoy)}
            delta={activeMetrics.yoy}
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
