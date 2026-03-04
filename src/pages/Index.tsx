import { DollarSign, Target, Percent, Users, FileUp, Settings } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { SalesTable } from "@/components/dashboard/SalesTable";
import { useSeller } from "@/contexts/SellerContext";
import { useSellerSalesData } from "@/hooks/useSellerSalesData";
import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PeriodFilter } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

function getDateRangeForPeriod(period: PeriodFilter, customRange?: { from: Date; to: Date }): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "quarter":
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "custom":
      return customRange ?? { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

const Index = () => {
  const { selectedSeller, getActiveMarketplaces } = useSeller();
  const activeMarketplaces = getActiveMarketplaces();
  const { getMarketplaceSummaryForDateRange, updateMarketplaceQuantity, hasAnyData } = useSellerSalesData();
  const { toast } = useToast();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("month");
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | "all">("all");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute date range from selected period
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(selectedPeriod, customDateRange);
  }, [selectedPeriod, customDateRange]);

  // Get marketplace summary for the date range
  const marketplaceSummary = useMemo(() => {
    return getMarketplaceSummaryForDateRange(dateRange.from, dateRange.to);
  }, [getMarketplaceSummaryForDateRange, dateRange]);

  // Filter by marketplace if selected
  const filteredMarketplaces = useMemo(() => {
    if (selectedMarketplace === "all") return marketplaceSummary;
    return marketplaceSummary.filter((mp) => mp.id === selectedMarketplace);
  }, [marketplaceSummary, selectedMarketplace]);

  // Check if has any data
  const hasDataForPeriod = useMemo(() => {
    return filteredMarketplaces.some((mp) => mp.hasImportedData);
  }, [filteredMarketplaces]);

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

  // Build marketplace options for filter
  const marketplaceFilterOptions = useMemo(() => {
    return activeMarketplaces.map((mp) => ({
      value: mp.id,
      label: mp.name,
      logo: mp.logo,
    }));
  }, [activeMarketplaces]);

  // Handle quantity update callback
  const handleUpdateQuantity = useCallback((marketplaceId: string, qtdVendas: number) => {
    const now = new Date();
    updateMarketplaceQuantity(marketplaceId, now.getFullYear(), now.getMonth() + 1, qtdVendas);
  }, [updateMarketplaceQuantity]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Dados atualizados",
        description: "O dashboard foi atualizado com sucesso.",
      });
    }, 500);
  }, [toast]);

  return (
    <div className="space-y-6">
        {/* Filters */}
        <FilterBar
          selectedPeriod={selectedPeriod}
          selectedMarketplace={selectedMarketplace}
          onPeriodChange={setSelectedPeriod}
          onMarketplaceChange={setSelectedMarketplace}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          lastUpdate={new Date().toLocaleString("pt-BR")}
          marketplaceOptions={marketplaceFilterOptions}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
        />

        {/* Empty State - No Data */}
        {!hasDataForPeriod && (
          <div className="bg-card rounded-xl p-8 text-center shadow-md">
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
                value={formatCurrency(calculatedSummary?.totalReceita ?? 0)}
                rawValue={calculatedSummary?.totalReceita ?? 0}
                valuePrefix="R$ "
                delta={calculatedSummary?.yoyGrowthGeral}
                deltaLabel="vs ano anterior"
                icon={<DollarSign className="w-5 h-5" />}
              />
              <KPICard
                title="% da Meta"
                value={`${(calculatedSummary?.metaPercentage ?? 0).toFixed(1)}%`}
                rawValue={calculatedSummary?.metaPercentage ?? 0}
                valueSuffix="%"
                valueDecimals={1}
                subtitle={`Meta: ${formatCurrency(calculatedSummary?.metaGeral ?? 0)}`}
                icon={<Target className="w-5 h-5" />}
              />
              <KPICard
                title="Crescimento Anual (YoY)"
                value={`${(calculatedSummary?.yoyGrowthGeral ?? 0) > 0 ? "+" : ""}${(calculatedSummary?.yoyGrowthGeral ?? 0).toFixed(1)}%`}
                rawValue={Math.abs(calculatedSummary?.yoyGrowthGeral ?? 0)}
                valuePrefix={(calculatedSummary?.yoyGrowthGeral ?? 0) >= 0 ? "+" : "-"}
                valueSuffix="%"
                valueDecimals={1}
                subtitle="Comparado ao mesmo período do ano anterior"
                icon={<Percent className="w-5 h-5" />}
              />
              <KPICard
                title="Marketplaces Ativos"
                value={formatNumber(filteredMarketplaces.length)}
                rawValue={filteredMarketplaces.length}
                subtitle={`${filteredMarketplaces.filter(mp => mp.metaPercentage >= 100).length} acima da meta`}
                icon={<Users className="w-5 h-5" />}
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
              loading={false}
              onUpdateQuantity={handleUpdateQuantity}
              isEditable={true}
            />
          </>
        )}
    </div>
  );
};

export default Index;
