import { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, Target, TrendingUp, Percent, AlertTriangle, Calendar, Maximize2, Settings2, Calculator } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { DailySalesChart } from "@/components/dashboard/DailySalesChart";
import { useSeller } from "@/contexts/SellerContext";
import { useSalesData } from "@/contexts/SalesDataContext";
import { useSellerSalesData, CalculatedDailySale } from "@/hooks/useSellerSalesData";
import { DailySale } from "@/data/mockData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import logoSandrini from "@/assets/logo-sandrini.jpg";
import logoBuyclock from "@/assets/logo-buyclock.jpg";

const SELLER_LOGOS: Record<string, string> = {
  sandrini: logoSandrini,
  buyclock: logoBuyclock,
};

const STORAGE_KEY_CYCLE = "tv_seller_cycle_s";
const STORAGE_KEY_REFRESH = "tv_refresh_min";

function getStoredNumber(key: string, fallback: number) {
  try {
    const v = localStorage.getItem(key);
    if (v) return Number(v);
  } catch {}
  return fallback;
}

const TVMode = () => {
  const { activeSellers, setSelectedSeller, selectedSeller } = useSeller();
  const { refreshData } = useSalesData();
  const { getDailySalesData } = useSellerSalesData();

  const currentDate = new Date();
  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth() + 1;

  const [sellerCycleSec, setSellerCycleSec] = useState(() => getStoredNumber(STORAGE_KEY_CYCLE, 15));
  const [refreshMin, setRefreshMin] = useState(() => getStoredNumber(STORAGE_KEY_REFRESH, 5));
  const [currentSellerIndex, setCurrentSellerIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"diario" | "mensal">("diario");
  const [clock, setClock] = useState(new Date());

  // Persist settings
  useEffect(() => { localStorage.setItem(STORAGE_KEY_CYCLE, String(sellerCycleSec)); }, [sellerCycleSec]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_REFRESH, String(refreshMin)); }, [refreshMin]);

  // Cycle: diário → mensal → next seller diário → mensal → ...
  useEffect(() => {
    const interval = setInterval(() => {
      setViewMode((prev) => {
        if (prev === "diario") {
          return "mensal";
        }
        // After mensal, advance to next seller (if multiple)
        if (activeSellers.length > 1) {
          setCurrentSellerIndex((prevIdx) => {
            const next = (prevIdx + 1) % activeSellers.length;
            setSelectedSeller(activeSellers[next].id);
            return next;
          });
        }
        return "diario";
      });
    }, sellerCycleSec * 1000);
    return () => clearInterval(interval);
  }, [activeSellers, setSelectedSeller, sellerCycleSec]);

  // Auto-refresh data (sem recarregar a página, mantém fullscreen)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, refreshMin * 60_000);
    return () => clearInterval(interval);
  }, [refreshMin, refreshData]);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Aggregate data
  const dailySalesData = useMemo((): CalculatedDailySale[] => {
    const activeMarketplaces = selectedSeller.activeMarketplaces;
    const allData: Record<number, CalculatedDailySale> = {};
    activeMarketplaces.forEach((mpId) => {
      const mpData = getDailySalesData(mpId, selectedYear, selectedMonth);
      mpData.forEach((day) => {
        if (!allData[day.dia]) {
          allData[day.dia] = { ...day, metaVendas: 0, vendaTotal: 0, vendaAprovadaReal: 0, vendaAnoAnterior: 0, gap: 0, metaAtingida: 0, yoyDia: 0, isImported: false };
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
  const monthlyMetrics = useMemo(() => {
    const data = dailySalesData;
    if (data.length === 0) return { metaTotal: 0, vendaTotal: 0, metaPercentage: 0, yoy: 0, gapTotal: 0, totalAnoAnterior: 0, mediaAtingimentoMeta: 0 };
    const metaTotal = data.reduce((s, d) => s + d.metaVendas, 0);
    const vendaTotal = data.reduce((s, d) => s + d.vendaTotal, 0);
    const totalAnoAnterior = data.reduce((s, d) => s + d.vendaAnoAnterior, 0);
    const gapTotal = data.reduce((s, d) => s + d.gap, 0);
    const metaPercentage = metaTotal > 0 ? (vendaTotal / metaTotal) * 100 : 0;
    const yoy = totalAnoAnterior > 0 ? ((vendaTotal - totalAnoAnterior) / totalAnoAnterior) * 100 : 0;
    const diasComVenda = data.filter((d) => d.vendaTotal > 0 && d.metaVendas > 0);
    const mediaAtingimentoMeta = diasComVenda.length > 0
      ? diasComVenda.reduce((s, d) => s + d.metaAtingida, 0) / diasComVenda.length
      : 0;
    return { metaTotal, vendaTotal, metaPercentage, yoy, gapTotal, totalAnoAnterior, mediaAtingimentoMeta };
  }, [dailySalesData]);

  // Daily metrics (yesterday / D-1)
  const dailyMetrics = useMemo(() => {
    const yesterday = currentDate.getDate() - 1;
    const isCurrentMonth = selectedYear === currentDate.getFullYear() && selectedMonth === (currentDate.getMonth() + 1);
    const dayData = isCurrentMonth && yesterday > 0 ? dailySalesData.find((d) => d.dia === yesterday) : null;
    if (!dayData) return { vendaTotal: 0, metaTotal: 0, metaPercentage: 0, gapTotal: 0, totalAnoAnterior: 0, yoy: 0, dia: yesterday || 1 };
    return {
      vendaTotal: dayData.vendaTotal,
      metaTotal: dayData.metaVendas,
      metaPercentage: dayData.metaAtingida,
      gapTotal: dayData.gap,
      totalAnoAnterior: dayData.vendaAnoAnterior,
      yoy: dayData.yoyDia,
      dia: dayData.dia,
    };
  }, [dailySalesData, currentDate, selectedYear, selectedMonth]);

  const activeMetrics = viewMode === "diario" ? dailyMetrics : monthlyMetrics;

  const chartData: DailySale[] = useMemo(() => dailySalesData.map(({ isImported, ...rest }) => rest as DailySale), [dailySalesData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const formatTime = (date: Date) =>
    date.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (date: Date) =>
    date.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  // Cycle progress bar — resets on every view/seller change
  const [cycleProgress, setCycleProgress] = useState(0);
  useEffect(() => {
    setCycleProgress(0);
    const cycleMs = sellerCycleSec * 1000;
    const interval = setInterval(() => {
      setCycleProgress((prev) => {
        const next = prev + (100 / (cycleMs / 100));
        return next >= 100 ? 0 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [currentSellerIndex, viewMode, sellerCycleSec]);

  const periodLabel = new Date(selectedYear, selectedMonth - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase());
  const viewLabel = viewMode === "diario"
    ? `Diário (${String(currentDate.getDate() - 1).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")})`
    : "Mensal";

  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col gap-4 select-none">
      {/* Top bar — everything in one row */}
      <div className="flex items-center justify-between">
        {/* Left: seller name + period + seller pills */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            {SELLER_LOGOS[selectedSeller.id] && (
              <img src={SELLER_LOGOS[selectedSeller.id]} alt={selectedSeller.name} className="h-10 w-10 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-2xl font-bold leading-tight">{selectedSeller.name}</h1>
              <p className="text-xs text-muted-foreground">{periodLabel} · Todos os marketplaces</p>
            </div>
          </div>
          {/* View mode pills */}
          <div className="flex items-center gap-2">
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-500 ${
              viewMode === "diario"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground opacity-50"
            }`}>
              Diário {`${String(currentDate.getDate() - 1).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}`}
            </div>
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-500 ${
              viewMode === "mensal"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground opacity-50"
            }`}>
              Mensal
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeSellers.map((seller, idx) => (
              <div
                key={seller.id}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-500 ${
                  idx === currentSellerIndex
                    ? "bg-primary text-primary-foreground scale-105"
                    : "bg-muted text-muted-foreground scale-95 opacity-50"
                }`}
              >
                {seller.initials}
              </div>
            ))}
          </div>
        </div>

        {/* Right: clock + controls */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{formatTime(clock)}</div>
            <div className="text-xs text-muted-foreground capitalize">{formatDate(clock)}</div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <Settings2 className="w-5 h-5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-5" align="end">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Alternar visão: {sellerCycleSec}s</Label>
                <Slider value={[sellerCycleSec]} onValueChange={([v]) => setSellerCycleSec(v)} min={5} max={60} step={5} />
                <div className="flex justify-between text-xs text-muted-foreground"><span>5s</span><span>60s</span></div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Atualizar dados: {refreshMin} min</Label>
                <Slider value={[refreshMin]} onValueChange={([v]) => setRefreshMin(v)} min={1} max={30} step={1} />
                <div className="flex justify-between text-xs text-muted-foreground"><span>1 min</span><span>30 min</span></div>
              </div>
            </PopoverContent>
          </Popover>

          <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <Maximize2 className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Cycle progress */}
      <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-100 ease-linear" style={{ width: `${cycleProgress}%` }} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title={viewMode === "diario" ? "Venda bruta (Dia)" : "Venda bruta aprovada"} value={formatCurrency(activeMetrics.vendaTotal)} rawValue={activeMetrics.vendaTotal} valuePrefix="R$ " delta={activeMetrics.yoy} deltaLabel="vs ano anterior" icon={<DollarSign className="w-5 h-5" />} />
        <KPICard title={viewMode === "diario" ? "Meta do dia" : "Meta do mês"} value={formatCurrency(activeMetrics.metaTotal)} rawValue={activeMetrics.metaTotal} valuePrefix="R$ " icon={<Target className="w-5 h-5" />} />
        <KPICard title={viewMode === "diario" ? "% da meta (Dia)" : "% da meta"} value={`${activeMetrics.metaPercentage.toFixed(1)}%`} rawValue={activeMetrics.metaPercentage} valueSuffix="%" valueDecimals={1} icon={<Percent className="w-5 h-5" />} />
        <KPICard title={viewMode === "diario" ? "GAP (Dia)" : "GAP"} value={formatCurrency(Math.abs(activeMetrics.gapTotal))} rawValue={Math.abs(activeMetrics.gapTotal)} valuePrefix={activeMetrics.gapTotal >= 0 ? "R$ +" : "R$ -"} delta={activeMetrics.metaTotal > 0 ? (activeMetrics.gapTotal >= 0 ? Math.abs(activeMetrics.gapTotal / activeMetrics.metaTotal * 100) : -Math.abs(activeMetrics.gapTotal / activeMetrics.metaTotal * 100)) : 0} deltaLabel={activeMetrics.gapTotal >= 0 ? "acima da meta" : "abaixo da meta"} icon={<AlertTriangle className="w-5 h-5" />} />
        <KPICard title={viewMode === "diario" ? "Ano anterior (Dia)" : "Ano anterior"} value={formatCurrency(activeMetrics.totalAnoAnterior)} rawValue={activeMetrics.totalAnoAnterior} valuePrefix="R$ " icon={<Calendar className="w-5 h-5" />} />
        <KPICard title="% YoY" value={`${activeMetrics.yoy >= 0 ? "+" : ""}${activeMetrics.yoy.toFixed(1)}%`} rawValue={Math.abs(activeMetrics.yoy)} delta={activeMetrics.yoy} deltaLabel="crescimento" icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[300px]">
        <DailySalesChart data={chartData} selectedMarketplace="all" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Atualização a cada {refreshMin} min · Alternância a cada {sellerCycleSec}s</span>
        <span>Última atualização: {formatTime(clock)}</span>
      </div>
    </div>
  );
};

export default TVMode;
