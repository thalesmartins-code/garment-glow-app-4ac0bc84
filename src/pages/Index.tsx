import { ShoppingCart, DollarSign, Target, TrendingUp, Percent, Users, FileUp, Settings } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { SalesTable } from "@/components/dashboard/SalesTable";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSeller } from "@/contexts/SellerContext";
import { useSellerSalesData } from "@/hooks/useSellerSalesData";
import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const meses = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const Index = () => {
  const { selectedSeller, getActiveMarketplaces } = useSeller();
  const activeMarketplaces = getActiveMarketplaces();
  const { getMarketplaceSummary, hasAnyData, getAvailableYears, getAvailableMonths, updateMarketplaceQuantity } = useSellerSalesData();

  const currentDate = new Date();
  const availableYears = getAvailableYears();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const availableMonths = getAvailableMonths(selectedYear);

  const {
    data,
    summary,
    isLoading,
    isRefreshing,
    error,
    selectedPeriod,
    selectedMarketplace,
    setSelectedPeriod,
    setSelectedMarketplace,
    refresh,
    hasData,
  } = useDashboardData();

  // Get marketplace summary for current period
  const marketplaceSummary = useMemo(() => {
    return getMarketplaceSummary(selectedYear, selectedMonth);
  }, [getMarketplaceSummary, selectedYear, selectedMonth]);

  // Filter by marketplace if selected
  const filteredMarketplaces = useMemo(() => {
    if (selectedMarketplace === "all") {
      return marketplaceSummary;
    }
    return marketplaceSummary.filter((mp) => mp.id === selectedMarketplace);
  }, [marketplaceSummary, selectedMarketplace]);

  // Check if has any data
  const hasDataForPeriod = useMemo(() => {
    return hasAnyData(selectedYear, selectedMonth);
  }, [hasAnyData, selectedYear, selectedMonth]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };

  // Calculate summary from filtered marketplaces
  const calculatedSummary = useMemo(() => {
    if (filteredMarketplaces.length === 0) return null;

    const totalReceita = filteredMarketplaces.reduce((sum, mp) => sum + mp.vendaTotal, 0);
    const metaGeral = filteredMarketplaces.reduce((sum, mp) => sum + mp.meta, 0);
    const vendaAnoAnteriorTotal = filteredMarketplaces.reduce((sum, mp) => sum + mp.vendaAnoAnterior, 0);
    
    return {
      totalReceita,
      metaGeral,
      metaPercentage: metaGeral > 0 ? (totalReceita / metaGeral) * 100 : 0,
      yoyGrowthGeral: vendaAnoAnteriorTotal > 0 ? ((totalReceita - vendaAnoAnteriorTotal) / vendaAnoAnteriorTotal) * 100 : 0,
    };
  }, [filteredMarketplaces]);

  // Build marketplace options for filter (only seller's active marketplaces)
  const marketplaceFilterOptions = useMemo(() => {
    return activeMarketplaces.map((mp) => ({
      value: mp.id,
      label: mp.name,
      logo: mp.logo,
    }));
  }, [activeMarketplaces]);

  // Handle quantity update callback
  const handleUpdateQuantity = useCallback((marketplaceId: string, qtdVendas: number) => {
    updateMarketplaceQuantity(marketplaceId, selectedYear, selectedMonth, qtdVendas);
  }, [updateMarketplaceQuantity, selectedYear, selectedMonth]);

  // Period label
  const periodLabel = `${meses.find(m => m.value === selectedMonth)?.label ?? ''} ${selectedYear}`;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        {/* Year/Month Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-card rounded-xl p-4 border-0 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mês:</span>
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.filter((m) => availableMonths.includes(m.value)).map((mes) => (
                  <SelectItem key={mes.value} value={String(mes.value)}>
                    {mes.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ano:</span>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
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
        </div>

        {/* Filters */}
        <FilterBar
          selectedPeriod={selectedPeriod}
          selectedMarketplace={selectedMarketplace}
          onPeriodChange={setSelectedPeriod}
          onMarketplaceChange={setSelectedMarketplace}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          lastUpdate={data?.lastUpdate}
          marketplaceOptions={marketplaceFilterOptions}
        />

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-xl p-4 flex items-center gap-3 shadow-md">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-medium">Erro ao carregar dados</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State - No Data */}
        {!hasDataForPeriod && !isLoading && (
          <div className="bg-card rounded-xl p-8 text-center border-0 shadow-md">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground mb-6">
              Importe dados de vendas para visualizar o dashboard do seller "{selectedSeller.name}".
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild>
                <Link to="/import">
                  <FileUp className="w-4 h-4 mr-2" />
                  Importar Dados
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar Metas
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* KPI Cards Grid - only show if has data */}
        {hasDataForPeriod && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Receita Total"
                value={isLoading ? "..." : formatCurrency(calculatedSummary?.totalReceita ?? 0)}
                rawValue={calculatedSummary?.totalReceita ?? 0}
                valuePrefix="R$ "
                delta={calculatedSummary?.yoyGrowthGeral}
                deltaLabel="vs ano anterior"
                icon={<DollarSign className="w-5 h-5" />}
                loading={isLoading}
              />
              <KPICard
                title="% da Meta"
                value={isLoading ? "..." : `${(calculatedSummary?.metaPercentage ?? 0).toFixed(1)}%`}
                rawValue={calculatedSummary?.metaPercentage ?? 0}
                valueSuffix="%"
                valueDecimals={1}
                subtitle={`Meta: ${formatCurrency(calculatedSummary?.metaGeral ?? 0)}`}
                icon={<Target className="w-5 h-5" />}
                loading={isLoading}
              />
              <KPICard
                title="Crescimento Anual (YoY)"
                value={isLoading ? "..." : `${(calculatedSummary?.yoyGrowthGeral ?? 0) > 0 ? "+" : ""}${(calculatedSummary?.yoyGrowthGeral ?? 0).toFixed(1)}%`}
                rawValue={Math.abs(calculatedSummary?.yoyGrowthGeral ?? 0)}
                valuePrefix={(calculatedSummary?.yoyGrowthGeral ?? 0) >= 0 ? "+" : "-"}
                valueSuffix="%"
                valueDecimals={1}
                subtitle="Comparado ao mesmo período do ano anterior"
                icon={<Percent className="w-5 h-5" />}
                loading={isLoading}
              />
              <KPICard
                title="Marketplaces Ativos"
                value={isLoading ? "..." : formatNumber(filteredMarketplaces.length)}
                rawValue={filteredMarketplaces.length}
                subtitle={`${filteredMarketplaces.filter(mp => mp.metaPercentage >= 100).length} acima da meta`}
                icon={<Users className="w-5 h-5" />}
                loading={isLoading}
              />
            </div>

            {/* Sales Table */}
            <SalesTable 
              data={filteredMarketplaces.map(mp => ({
                ...mp,
                vendas: mp.qtdVendas,
                vendaAprovadaReal: mp.vendaAprovadaReal ?? 0,
                pmt: mp.ticketMedio,
                lastYearTotal: mp.vendaAnoAnterior,
              }))} 
              loading={isLoading}
              onUpdateQuantity={handleUpdateQuantity}
              isEditable={true}
            />
          </>
        )}

        {/* Footer */}
        <footer className="text-center py-6 text-sm text-muted-foreground">
          <p>
            Dashboard Executivo de Vendas • Dados baseados em importações
          </p>
        </footer>
    </div>
  );
};

export default Index;
