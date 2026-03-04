import { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, Target, TrendingUp, Percent, AlertTriangle, Calendar, Monitor, Maximize2 } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { DailySalesChart } from "@/components/dashboard/DailySalesChart";
import { useSeller } from "@/contexts/SellerContext";
import { useSalesData } from "@/contexts/SalesDataContext";
import { useSellerSalesData, CalculatedDailySale } from "@/hooks/useSellerSalesData";
import { DailySale } from "@/data/mockData";

const SELLER_CYCLE_MS = 15_000; // 15 seconds
const REFRESH_MS = 5 * 60_000; // 5 minutes

const TVMode = () => {
  const { activeSellers, setSelectedSeller, selectedSeller } = useSeller();
  useSalesData(); // keep context active
  const { getDailySalesData, getAvailableYears, getAvailableMonths } = useSellerSalesData();

  const currentDate = new Date();
  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth() + 1;

  const [currentSellerIndex, setCurrentSellerIndex] = useState(0);
  const [clock, setClock] = useState(new Date());

  // Cycle sellers every 15s
  useEffect(() => {
    if (activeSellers.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSellerIndex((prev) => {
        const next = (prev + 1) % activeSellers.length;
        setSelectedSeller(activeSellers[next].id);
        return next;
      });
    }, SELLER_CYCLE_MS);
    return () => clearInterval(interval);
  }, [activeSellers, setSelectedSeller]);

  // Auto-refresh every 5 min (reload page to get fresh data)
  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  // Clock update every second
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Aggregate data from all marketplaces for current seller
  const dailySalesData = useMemo((): CalculatedDailySale[] => {
    const activeMarketplaces = selectedSeller.activeMarketplaces;
    const allData: Record<number, CalculatedDailySale> = {};

    activeMarketplaces.forEach((mpId) => {
      const mpData = getDailySalesData(mpId, selectedYear, selectedMonth);
      mpData.forEach((day) => {
        if (!allData[day.dia]) {
          allData[day.dia] = {
            ...day,
            metaVendas: 0, vendaTotal: 0, vendaAprovadaReal: 0,
            vendaAnoAnterior: 0, gap: 0, metaAtingida: 0, yoyDia: 0, isImported: false,
          };
        }
        allData[day.dia].metaVendas += day.metaVendas;
        allData[day.dia].vendaTotal += day.vendaTotal;
        allData[day.dia].vendaAprovadaReal += day.vendaAprovadaReal;
        allData[day.dia].vendaAnoAnterior += day.vendaAnoAnterior;
        allData[day.dia].isImported = allData[day.dia].isImported || day.isImported;
      });
    });

    return Object.values(allData).map((day) => ({
      ...day,
      gap: Math.round((day.vendaTotal - day.metaVendas) * 100) / 100,
      metaAtingida: day.metaVendas > 0 ? Math.round((day.vendaTotal / day.metaVendas) * 100 * 100) / 100 : 0,
      yoyDia: day.vendaAnoAnterior > 0 ? Math.round(((day.vendaTotal - day.vendaAnoAnterior) / day.vendaAnoAnterior) * 100 * 100) / 100 : 0,
    })).sort((a, b) => a.dia - b.dia);
  }, [selectedSeller, selectedYear, selectedMonth, getDailySalesData]);

  // Monthly metrics
  const metrics = useMemo(() => {
    const data = dailySalesData;
    if (data.length === 0) {
      return { metaTotal: 0, vendaTotal: 0, metaPercentage: 0, yoy: 0, gapTotal: 0, totalAnoAnterior: 0 };
    }
    const metaTotal = data.reduce((s, d) => s + d.metaVendas, 0);
    const vendaTotal = data.reduce((s, d) => s + d.vendaTotal, 0);
    const totalAnoAnterior = data.reduce((s, d) => s + d.vendaAnoAnterior, 0);
    const gapTotal = data.reduce((s, d) => s + d.gap, 0);
    const metaPercentage = metaTotal > 0 ? (vendaTotal / metaTotal) * 100 : 0;
    const yoy = totalAnoAnterior > 0 ? ((vendaTotal - totalAnoAnterior) / totalAnoAnterior) * 100 : 0;
    return { metaTotal, vendaTotal, metaPercentage, yoy, gapTotal, totalAnoAnterior };
  }, [dailySalesData]);

  const chartData: DailySale[] = useMemo(() => {
    return dailySalesData.map(({ isImported, ...rest }) => rest as DailySale);
  }, [dailySalesData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const formatTime = (date: Date) =>
    date.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatDate = (date: Date) =>
    date.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  // Progress bar for seller cycle
  const [cycleProgress, setCycleProgress] = useState(0);
  useEffect(() => {
    if (activeSellers.length <= 1) return;
    setCycleProgress(0);
    const step = 100;
    const interval = setInterval(() => {
      setCycleProgress((prev) => {
        const next = prev + (step / (SELLER_CYCLE_MS / 100));
        return next >= 100 ? 0 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [currentSellerIndex, activeSellers.length]);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col gap-6 cursor-none select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Monitor className="w-6 h-6 text-primary" />
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Modo TV</span>
        </div>

        <div className="flex items-center gap-6">
          {/* Seller indicator */}
          <div className="flex items-center gap-3">
            {activeSellers.map((seller, idx) => (
              <div
                key={seller.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-500 ${
                  idx === currentSellerIndex
                    ? "bg-primary text-primary-foreground scale-110"
                    : "bg-muted text-muted-foreground scale-90 opacity-50"
                }`}
              >
                <span>{seller.initials}</span>
                <span className="hidden lg:inline">{seller.name}</span>
              </div>
            ))}
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{formatTime(clock)}</div>
            <div className="text-xs text-muted-foreground capitalize">{formatDate(clock)}</div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Maximize2 className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Seller cycle progress */}
      {activeSellers.length > 1 && (
        <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{ width: `${cycleProgress}%` }}
          />
        </div>
      )}

      {/* Current seller title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">{selectedSeller.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date(selectedYear, selectedMonth - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase())}
          {" · Todos os marketplaces"}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
        <KPICard
          title="Ano anterior"
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

      {/* Chart - takes remaining space */}
      <div className="flex-1 min-h-[300px]">
        <DailySalesChart data={chartData} selectedMarketplace="all" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Atualização automática a cada 5 minutos</span>
        <span>Última atualização: {formatTime(clock)}</span>
      </div>
    </div>
  );
};

export default TVMode;
