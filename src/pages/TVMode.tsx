import { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, Target, TrendingUp, Percent, AlertTriangle, Calendar, Maximize2, Settings2 } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { DailySalesChart } from "@/components/dashboard/DailySalesChart";
import { useSeller } from "@/contexts/SellerContext";
import { useSalesData } from "@/contexts/SalesDataContext";
import { useSellerSalesData, CalculatedDailySale } from "@/hooks/useSellerSalesData";
import { DailySale } from "@/data/mockData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

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
  useSalesData();
  const { getDailySalesData } = useSellerSalesData();

  const currentDate = new Date();
  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth() + 1;

  const [sellerCycleSec, setSellerCycleSec] = useState(() => getStoredNumber(STORAGE_KEY_CYCLE, 15));
  const [refreshMin, setRefreshMin] = useState(() => getStoredNumber(STORAGE_KEY_REFRESH, 5));
  const [currentSellerIndex, setCurrentSellerIndex] = useState(0);
  const [clock, setClock] = useState(new Date());

  // Persist settings
  useEffect(() => { localStorage.setItem(STORAGE_KEY_CYCLE, String(sellerCycleSec)); }, [sellerCycleSec]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_REFRESH, String(refreshMin)); }, [refreshMin]);

  // Cycle sellers
  useEffect(() => {
    if (activeSellers.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSellerIndex((prev) => {
        const next = (prev + 1) % activeSellers.length;
        setSelectedSeller(activeSellers[next].id);
        return next;
      });
    }, sellerCycleSec * 1000);
    return () => clearInterval(interval);
  }, [activeSellers, setSelectedSeller, sellerCycleSec]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, refreshMin * 60_000);
    return () => clearInterval(interval);
  }, [refreshMin]);

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

  const metrics = useMemo(() => {
    const data = dailySalesData;
    if (data.length === 0) return { metaTotal: 0, vendaTotal: 0, metaPercentage: 0, yoy: 0, gapTotal: 0, totalAnoAnterior: 0 };
    const metaTotal = data.reduce((s, d) => s + d.metaVendas, 0);
    const vendaTotal = data.reduce((s, d) => s + d.vendaTotal, 0);
    const totalAnoAnterior = data.reduce((s, d) => s + d.vendaAnoAnterior, 0);
    const gapTotal = data.reduce((s, d) => s + d.gap, 0);
    const metaPercentage = metaTotal > 0 ? (vendaTotal / metaTotal) * 100 : 0;
    const yoy = totalAnoAnterior > 0 ? ((vendaTotal - totalAnoAnterior) / totalAnoAnterior) * 100 : 0;
    return { metaTotal, vendaTotal, metaPercentage, yoy, gapTotal, totalAnoAnterior };
  }, [dailySalesData]);

  const chartData: DailySale[] = useMemo(() => dailySalesData.map(({ isImported, ...rest }) => rest as DailySale), [dailySalesData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const formatTime = (date: Date) =>
    date.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (date: Date) =>
    date.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  // Cycle progress bar
  const [cycleProgress, setCycleProgress] = useState(0);
  useEffect(() => {
    if (activeSellers.length <= 1) return;
    setCycleProgress(0);
    const cycleMs = sellerCycleSec * 1000;
    const interval = setInterval(() => {
      setCycleProgress((prev) => {
        const next = prev + (100 / (cycleMs / 100));
        return next >= 100 ? 0 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [currentSellerIndex, activeSellers.length, sellerCycleSec]);

  const periodLabel = new Date(selectedYear, selectedMonth - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col gap-4 cursor-none select-none">
      {/* Top bar — everything in one row */}
      <div className="flex items-center justify-between">
        {/* Left: seller name + period + seller pills */}
        <div className="flex items-center gap-5">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{selectedSeller.name}</h1>
            <p className="text-xs text-muted-foreground">{periodLabel} · Todos os marketplaces</p>
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
                <Label className="text-sm font-medium">Alternar sellers: {sellerCycleSec}s</Label>
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

      {/* Seller cycle progress */}
      {activeSellers.length > 1 && (
        <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-100 ease-linear" style={{ width: `${cycleProgress}%` }} />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Venda bruta aprovada" value={formatCurrency(metrics.vendaTotal)} rawValue={metrics.vendaTotal} valuePrefix="R$ " delta={metrics.yoy} deltaLabel="vs ano anterior" icon={<DollarSign className="w-5 h-5" />} />
        <KPICard title="Meta do mês" value={formatCurrency(metrics.metaTotal)} rawValue={metrics.metaTotal} valuePrefix="R$ " icon={<Target className="w-5 h-5" />} />
        <KPICard title="% da meta" value={`${metrics.metaPercentage.toFixed(1)}%`} rawValue={metrics.metaPercentage} valueSuffix="%" valueDecimals={1} icon={<Percent className="w-5 h-5" />} />
        <KPICard title="GAP" value={formatCurrency(Math.abs(metrics.gapTotal))} rawValue={Math.abs(metrics.gapTotal)} valuePrefix={metrics.gapTotal >= 0 ? "R$ +" : "R$ -"} delta={metrics.metaTotal > 0 ? (metrics.gapTotal >= 0 ? Math.abs(metrics.gapTotal / metrics.metaTotal * 100) : -Math.abs(metrics.gapTotal / metrics.metaTotal * 100)) : 0} deltaLabel={metrics.gapTotal >= 0 ? "acima da meta" : "abaixo da meta"} icon={<AlertTriangle className="w-5 h-5" />} />
        <KPICard title="Ano anterior" value={formatCurrency(metrics.totalAnoAnterior)} rawValue={metrics.totalAnoAnterior} valuePrefix="R$ " icon={<Calendar className="w-5 h-5" />} />
        <KPICard title="% YoY" value={`${metrics.yoy >= 0 ? "+" : ""}${metrics.yoy.toFixed(1)}%`} rawValue={Math.abs(metrics.yoy)} delta={metrics.yoy} deltaLabel="crescimento" icon={<TrendingUp className="w-5 h-5" />} />
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
