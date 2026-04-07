import { useState, useMemo } from "react";
import { useMLInventory } from "@/contexts/MLInventoryContext";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingBag, RefreshCw, Search, ExternalLink, Plug, DollarSign, Tag, TrendingUp, Package,
  ChevronDown, ChevronRight, Receipt, LayoutGrid, Truck, ArrowUpDown, ArrowUp, ArrowDown,
  BookOpen,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, Area,
} from "recharts";

import type { ProductVariation } from "@/contexts/MLInventoryContext";
import { LISTING_TYPE_RATES } from "@/data/financialMockData";

// ─── Financial helpers ────────────────────────────────────────────────────────

function getCommissionRate(listingTypeId: string | null): number {
  if (!listingTypeId) return LISTING_TYPE_RATES.classic.rate;
  if (listingTypeId.includes("gold_pro") || listingTypeId.includes("premium")) return LISTING_TYPE_RATES.premium.rate;
  if (listingTypeId.includes("free")) return LISTING_TYPE_RATES.free.rate;
  return LISTING_TYPE_RATES.classic.rate;
}

function getListingLabel(listingTypeId: string | null): string {
  if (!listingTypeId) return "Clássico";
  if (listingTypeId.includes("gold_pro") || listingTypeId.includes("premium")) return "Premium";
  if (listingTypeId.includes("free")) return "Grátis";
  return "Clássico";
}

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const listingBadge = (listingTypeId: string | null, commRate: number) => {
  const label = getListingLabel(listingTypeId);
  const pct = (commRate * 100).toFixed(1);
  if (label === "Premium") return <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">{label} · {pct}%</Badge>;
  if (label === "Grátis") return <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">{label} · {pct}%</Badge>;
  return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{label} · {pct}%</Badge>;
};

type StatusFilter = "all" | "active" | "paused";
type StockFilter = "all" | "in_stock" | "low" | "out";
type SortBy = "title_asc" | "title_desc" | "price_desc" | "price_asc" | "stock_desc" | "stock_asc";
type LogisticFilter = "all" | "fulfillment" | "cross_docking" | "self_service" | "drop_off";
type ColumnView = "estoque" | "financeiro";

const healthBadge = (health: number | null) => {
  if (health === null) return <span className="text-xs text-muted-foreground">—</span>;
  if (health >= 0.8) return <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">Ótima</Badge>;
  if (health >= 0.5) return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Regular</Badge>;
  return <Badge variant="destructive" className="text-xs">Baixa</Badge>;
};

const stockBadge = (qty: number) => {
  if (qty === 0) return <Badge variant="outline" className="text-xs text-muted-foreground">Sem estoque</Badge>;
  if (qty <= 5) return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Baixo</Badge>;
  return <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">OK</Badge>;
};

const variationLabel = (v: ProductVariation) =>
  v.attribute_combinations.map((a) => a.value).join(" / ") || `Var. ${v.variation_id}`;

/** Shown when the listing is linked to the ML product catalog */
function CatalogBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 cursor-default leading-none">
          <BookOpen className="w-2.5 h-2.5" />
          Catálogo
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs max-w-[180px]">
        Anúncio vinculado ao catálogo de produtos do Mercado Livre
      </TooltipContent>
    </Tooltip>
  );
}

/** Shown when the listing participates in one or more active ML promotions */
function PromoBadge({ count }: { count: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 cursor-default leading-none">
          <Tag className="w-2.5 h-2.5" />
          {count > 1 ? `${count} promoções` : "Em promoção"}
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs max-w-[180px]">
        Anúncio participando de {count > 1 ? `${count} promoções` : "uma promoção"} ativa no Mercado Livre
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Sortable header helper ──────────────────────────────────────────────────
function SortableHead({ label, field, current, onSort, className = "" }: {
  label: string; field: string; current: SortBy; onSort: (f: string) => void; className?: string;
}) {
  const asc = `${field}_asc` as SortBy;
  const desc = `${field}_desc` as SortBy;
  const isActive = current === asc || current === desc;
  const isAsc = current === asc;
  return (
    <TableHead className={`${className} cursor-pointer select-none group`} onClick={() => onSort(field)}>
      <div className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          isAsc ? <ArrowUp className="w-3 h-3 text-foreground" /> : <ArrowDown className="w-3 h-3 text-foreground" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </TableHead>
  );
}

import { Progress } from "@/components/ui/progress";

export default function MLProdutos() {
  const { items, loading, hasToken, lastUpdated, refresh } = useMLInventory();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("title_asc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [columnView, setColumnView] = useState<ColumnView>("estoque");
  const [brandFilter, setBrandFilter] = useState("all");
  const [hideOutOfStock, setHideOutOfStock] = useState(true);
  const [logisticFilter, setLogisticFilter] = useState<LogisticFilter>("all");
  const [rankingBrandFilter, setRankingBrandFilter] = useState("all");
  const [reportTab, setReportTab] = useState("ranking");

  const toggleSort = (field: string) => {
    const asc = `${field}_asc` as SortBy;
    const desc = `${field}_desc` as SortBy;
    setSortBy((prev) => (prev === asc ? desc : asc));
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Unique brands for filter
  const brands = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => { if (i.brand) set.add(i.brand); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Derived stats
  const totalRevenuePotential = items.reduce((s, i) => s + i.price * i.available_quantity, 0);
  const avgPrice = items.length > 0 ? items.reduce((s, i) => s + i.price, 0) / items.length : 0;
  const totalSold = items.reduce((s, i) => s + i.sold_quantity, 0);
  const totalSoldRevenue = items.reduce((s, i) => s + i.sold_quantity * i.price, 0);

  // Filter + sort
  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.id.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;
        if (statusFilter === "active" && item.status !== "active") return false;
        if (statusFilter === "paused" && item.status !== "paused") return false;
        if (stockFilter === "out" && item.available_quantity !== 0) return false;
        if (stockFilter === "low" && !(item.available_quantity > 0 && item.available_quantity <= 5)) return false;
        if (stockFilter === "in_stock" && item.available_quantity === 0) return false;
        if (brandFilter !== "all" && (item.brand || "") !== brandFilter) return false;
        if (hideOutOfStock && item.available_quantity === 0) return false;
        if (logisticFilter !== "all" && (item.logistic_type || "") !== logisticFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "stock_desc") return b.available_quantity - a.available_quantity;
        if (sortBy === "stock_asc") return a.available_quantity - b.available_quantity;
        if (sortBy === "title_desc") return b.title.localeCompare(a.title);
        return a.title.localeCompare(b.title);
      });
  }, [items, search, statusFilter, stockFilter, sortBy, brandFilter, hideOutOfStock, logisticFilter]);

  // ─── Reports data ───────────────────────────────────────────────────────────
  const rankingAll = useMemo(() => {
    const totalRev = items.reduce((s, i) => s + i.sold_quantity * i.price, 0);
    return [...items]
      .sort((a, b) => b.sold_quantity - a.sold_quantity)
      .map((i) => {
        const rev = i.sold_quantity * i.price;
        return {
          id: i.id,
          title: i.title,
          thumbnail: i.thumbnail,
          price: i.price,
          sold: i.sold_quantity,
          revenue: rev,
          stock: i.available_quantity,
          share: totalRev > 0 ? (rev / totalRev) * 100 : 0,
          brand: i.brand || "Sem marca",
        };
      });
  }, [items]);

  const rankingFiltered = useMemo(() => {
    if (rankingBrandFilter === "all") return rankingAll;
    return rankingAll.filter((r) => r.brand === rankingBrandFilter);
  }, [rankingAll, rankingBrandFilter]);

  const rankingKPIs = useMemo(() => {
    const totalUnits = rankingFiltered.reduce((s, r) => s + r.sold, 0);
    const totalRev = rankingFiltered.reduce((s, r) => s + r.revenue, 0);
    return { totalUnits, totalRev, avgTicket: totalUnits > 0 ? totalRev / totalUnits : 0 };
  }, [rankingFiltered]);

  const brandData = useMemo(() => {
    const map = new Map<string, { revenue: number; qty: number; ads: number; stock: number }>();
    items.forEach((i) => {
      const brand = i.brand || "Sem marca";
      const prev = map.get(brand) ?? { revenue: 0, qty: 0, ads: 0, stock: 0 };
      map.set(brand, {
        revenue: prev.revenue + i.sold_quantity * i.price,
        qty: prev.qty + i.sold_quantity,
        ads: prev.ads + 1,
        stock: prev.stock + i.available_quantity,
      });
    });
    return Array.from(map.entries())
      .map(([brand, d]) => ({ brand, ...d, avgTicket: d.qty > 0 ? d.revenue / d.qty : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [items]);

  const maxBrandRevenue = brandData.length > 0 ? brandData[0].revenue : 1;

  // Chart data for brand analysis
  const CHART_COLORS = [
    "hsl(var(--primary))", "hsl(var(--accent))", "hsl(25,95%,53%)", "hsl(270,70%,50%)",
    "hsl(160,60%,45%)", "hsl(340,75%,55%)", "hsl(200,70%,50%)", "hsl(45,93%,47%)",
    "hsl(120,40%,55%)", "hsl(0,65%,50%)",
  ];

  const brandBarData = useMemo(() =>
    brandData.slice(0, 10).map((b) => ({ name: b.brand, revenue: b.revenue })),
  [brandData]);

  const brandPieData = useMemo(() => {
    const top8 = brandData.slice(0, 8).map((b) => ({ name: b.brand, value: b.qty }));
    const othersQty = brandData.slice(8).reduce((s, b) => s + b.qty, 0);
    if (othersQty > 0) top8.push({ name: "Outros", value: othersQty });
    return top8;
  }, [brandData]);

  // ─── ABC Curve data ──────────────────────────────────────────────────────────
  const abcData = useMemo(() => {
    const sorted = [...items]
      .map((i) => ({ id: i.id, title: i.title, thumbnail: i.thumbnail, price: i.price, sold: i.sold_quantity, revenue: i.sold_quantity * i.price, stock: i.available_quantity, brand: i.brand || "Sem marca" }))
      .sort((a, b) => b.revenue - a.revenue);
    const totalRev = sorted.reduce((s, r) => s + r.revenue, 0);
    let cumPct = 0;
    return sorted.map((r, idx) => {
      cumPct += totalRev > 0 ? (r.revenue / totalRev) * 100 : 0;
      const curve = cumPct <= 80 ? "A" : cumPct <= 95 ? "B" : "C";
      return { ...r, cumPct: Math.min(cumPct, 100), pct: totalRev > 0 ? (r.revenue / totalRev) * 100 : 0, curve, rank: idx + 1 };
    });
  }, [items]);

  const abcSummary = useMemo(() => {
    const a = abcData.filter((d) => d.curve === "A");
    const b = abcData.filter((d) => d.curve === "B");
    const c = abcData.filter((d) => d.curve === "C");
    const totalRev = abcData.reduce((s, d) => s + d.revenue, 0);
    return {
      A: { count: a.length, revenue: a.reduce((s, d) => s + d.revenue, 0), pct: totalRev > 0 ? (a.reduce((s, d) => s + d.revenue, 0) / totalRev) * 100 : 0 },
      B: { count: b.length, revenue: b.reduce((s, d) => s + d.revenue, 0), pct: totalRev > 0 ? (b.reduce((s, d) => s + d.revenue, 0) / totalRev) * 100 : 0 },
      C: { count: c.length, revenue: c.reduce((s, d) => s + d.revenue, 0), pct: totalRev > 0 ? (c.reduce((s, d) => s + d.revenue, 0) / totalRev) * 100 : 0 },
      total: abcData.length,
    };
  }, [abcData]);

  const abcChartData = useMemo(() => {
    if (abcData.length === 0) return [];
    const step = Math.max(1, Math.floor(abcData.length / 50));
    return abcData.filter((_, idx) => idx % step === 0 || idx === abcData.length - 1).map((d) => ({
      rank: d.rank,
      pct: Number(d.pct.toFixed(2)),
      cumPct: Number(d.cumPct.toFixed(2)),
      title: d.title,
      curve: d.curve,
    }));
  }, [abcData]);

  if (hasToken === false) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Plug className="w-12 h-12 mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold mb-2">Conta não conectada</h3>
            <p className="text-sm text-muted-foreground mb-4">Conecte sua conta do Mercado Livre para visualizar os anúncios.</p>
            <Button asChild><Link to="/integracoes">Ir para Integrações</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Tabs defaultValue="catalogo" className="space-y-5">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 -mx-8 px-8 pb-3 pt-1 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center justify-between gap-4">
          <MLPageHeader title="Anúncios" lastUpdated={lastUpdated} />
          <div className="flex items-center gap-3">
            <TabsList className="h-8">
              <TabsTrigger value="catalogo" className="text-xs px-3 h-7">Catálogo</TabsTrigger>
              <TabsTrigger value="relatorios" className="text-xs px-3 h-7">Relatórios</TabsTrigger>
            </TabsList>
            <Button onClick={refresh} disabled={loading} size="sm" variant="outline" className="h-8">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════ ABA CATÁLOGO ═══════════════════ */}
      <TabsContent value="catalogo" className="space-y-5 mt-0">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading && items.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <KPICard title="Total de Anúncios" value={String(items.length)} icon={<ShoppingBag className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-accent/10 text-accent" />
              <KPICard title="Ticket Médio" value={currencyFmt(avgPrice)} icon={<Tag className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]" />
              <KPICard title="Unidades Vendidas" value={String(totalSold)} icon={<TrendingUp className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-[hsl(270,70%,50%)]/10 text-[hsl(270,70%,50%)]" />
              <KPICard title="Receita Potencial" value={currencyFmt(totalRevenuePotential)} icon={<DollarSign className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-success/10 text-success" />
            </>
          )}
        </div>

        {/* Filters + Table */}
        <Card>
          <div className="px-4 pt-4 pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">Catálogo de Anúncios</span>
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {/* Search */}
                <div className="relative flex-1 sm:w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>

                {/* Brand filter */}
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as marcas</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Logistic filter */}
                <Select value={logisticFilter} onValueChange={(v) => setLogisticFilter(v as LogisticFilter)}>
                  <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toda logística</SelectItem>
                    <SelectItem value="fulfillment">Full</SelectItem>
                    <SelectItem value="cross_docking">Coleta</SelectItem>
                    <SelectItem value="self_service">Flex</SelectItem>
                    <SelectItem value="drop_off">Drop Off</SelectItem>
                  </SelectContent>
                </Select>

                {/* Hide out of stock */}
                <label className="flex items-center gap-1.5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                  <Checkbox
                    checked={hideOutOfStock}
                    onCheckedChange={(v) => setHideOutOfStock(!!v)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Ocultar sem estoque</span>
                </label>

                {/* Column view toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                      <button
                        onClick={() => setColumnView("estoque")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${columnView === "estoque" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" /> Estoque
                      </button>
                      <button
                        onClick={() => setColumnView("financeiro")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${columnView === "financeiro" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Receipt className="w-3.5 h-3.5" /> Margem
                      </button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Alternar visão de colunas</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <CardContent className="p-0">
            {loading && items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Carregando anúncios...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{search || stockFilter !== "all" || statusFilter !== "all" ? "Nenhum produto encontrado" : "Nenhum produto ativo"}</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="w-12"></TableHead>
                      <SortableHead label="Anúncio" field="title" current={sortBy} onSort={toggleSort} />
                      <TableHead className="text-left w-24">Marca</TableHead>
                      
                      <SortableHead label="Preço" field="price" current={sortBy} onSort={toggleSort} className="text-right w-24" />
                      {columnView === "estoque" ? (
                        <>
                          <SortableHead label="Estoque" field="stock" current={sortBy} onSort={toggleSort} className="text-center w-20" />
                          <TableHead className="text-center w-24">Logística</TableHead>
                          <TableHead className="text-center w-20">Frete Grátis</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-right w-24">Custo</TableHead>
                          <TableHead className="text-left w-36">Tipo / Comissão</TableHead>
                          <TableHead className="text-right w-32">Comissão/unid.</TableHead>
                          <TableHead className="text-right w-28">Margem est.</TableHead>
                          
                        </>
                      )}
                      
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => {
                      const soldRevenue = item.sold_quantity * item.price;
                      const isExpanded = expandedRows.has(item.id);
                      const sku = item.seller_custom_field || null;

                      return (
                        <>
                          <TableRow
                            key={item.id}
                            className={item.has_variations ? "cursor-pointer hover:bg-muted/50" : ""}
                            onClick={() => item.has_variations && toggleRow(item.id)}
                          >
                            <TableCell className="p-1 pl-3">
                              {item.has_variations ? (
                                isExpanded
                                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              ) : null}
                            </TableCell>

                            <TableCell className="p-2" onClick={(e) => e.stopPropagation()}>
                              {item.thumbnail ? (
                                <img src={item.thumbnail.replace("http://", "https://")} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>

                            <TableCell>
                              <a href={`https://produto.mercadolivre.com.br/${item.id.replace(/^(MLB)(\d+)$/, "$1-$2")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm font-medium line-clamp-2 leading-tight hover:underline hover:text-primary transition-colors">
                                {item.title} <ExternalLink className="w-3 h-3 inline mb-0.5 ml-0.5" />
                              </a>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <p className="text-xs text-muted-foreground">{item.id}</p>
                                {sku && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                                    {sku}
                                  </Badge>
                                )}
                                {item.has_variations && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {item.variations.length} variações
                                  </Badge>
                                )}
                                {item.catalog_product_id && <CatalogBadge />}
                                {item.deal_ids.length > 0 && <PromoBadge count={item.deal_ids.length} />}
                              </div>
                            </TableCell>

                            <TableCell className="text-left text-xs text-muted-foreground">{item.brand || "—"}</TableCell>
                            
                            <TableCell className="text-right text-sm font-medium">{currencyFmt(item.price)}</TableCell>

                            {columnView === "estoque" ? (
                              <>
                                <TableCell className="text-center">
                                  <span className={`text-sm font-semibold ${item.available_quantity === 0 ? "text-destructive" : "text-foreground"}`}>
                                    {item.available_quantity}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.logistic_type ? (
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                                      item.logistic_type === "fulfillment" ? "border-blue-500 text-blue-600 bg-blue-50" :
                                      item.logistic_type === "self_service" ? "border-amber-500 text-amber-600 bg-amber-50" :
                                      ""
                                    }`}>
                                      {item.logistic_type === "fulfillment" ? "Full" :
                                       item.logistic_type === "cross_docking" ? "Coleta" :
                                       item.logistic_type === "self_service" ? "Flex" :
                                       item.logistic_type === "drop_off" ? "Drop Off" :
                                       item.logistic_type}
                                    </Badge>
                                  ) : <span className="text-xs text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.free_shipping ? (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500 text-emerald-600 bg-emerald-50">
                                      <Truck className="w-3 h-3 mr-0.5" /> Sim
                                    </Badge>
                                  ) : <span className="text-xs text-muted-foreground">Não</span>}
                                </TableCell>
                              </>
                            ) : (() => {
                              const commRate = getCommissionRate(item.listing_type_id);
                              const commPerUnit = Math.round(item.price * commRate * 100) / 100;
                              const netPerUnit = Math.round((item.price - commPerUnit) * 100) / 100;
                              const marginPct = item.price > 0 ? Math.round((netPerUnit / item.price) * 1000) / 10 : 0;
                              const marginColor = marginPct >= 70 ? "text-emerald-600" : marginPct >= 50 ? "text-amber-600" : "text-red-600";
                              return (
                                <>
                                  <TableCell className="text-right text-xs text-muted-foreground italic">A informar</TableCell>
                                  <TableCell className="text-left">
                                    {listingBadge(item.listing_type_id, commRate)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-destructive font-mono">−{currencyFmt(commPerUnit)}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={`text-sm font-bold ${marginColor}`}>{marginPct.toFixed(1)}%</span>
                                  </TableCell>
                                </>
                              );
                            })()}

                          </TableRow>

                          {/* Expanded variations sub-table */}
                          {item.has_variations && isExpanded && (
                            <TableRow key={`${item.id}-variations`}>
                              <TableCell colSpan={10} className="p-0 bg-muted/20 border-b">
                                <div className="px-10 py-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-b border-border/50">
                                        <TableHead className="text-xs h-8 font-medium">Variação</TableHead>
                                        <TableHead className="text-xs h-8 font-medium text-left">SKU</TableHead>
                                        <TableHead className="text-xs h-8 font-medium text-right">Preço</TableHead>
                                        {columnView === "estoque" ? (
                                          <>
                                            <TableHead className="text-xs h-8 font-medium text-center">Estoque</TableHead>
                                            <TableHead className="text-xs h-8 font-medium text-center" colSpan={2}>—</TableHead>
                                          </>
                                        ) : (
                                          <>
                                            <TableHead className="text-xs h-8 font-medium text-right">Custo</TableHead>
                                            <TableHead className="text-xs h-8 font-medium text-left">Tipo / Comissão</TableHead>
                                            <TableHead className="text-xs h-8 font-medium text-right">Comissão/unid.</TableHead>
                                            <TableHead className="text-xs h-8 font-medium text-right">Margem est.</TableHead>
                                          </>
                                        )}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {item.variations
                                        .filter((v) => !hideOutOfStock || v.available_quantity > 0)
                                        .map((v) => {
                                        const vSku = v.seller_custom_field || null;
                                        return (
                                          <TableRow key={v.variation_id} className="border-b border-border/30 last:border-0">
                                            <TableCell className="py-2 text-xs font-medium">{variationLabel(v)}</TableCell>
                                            <TableCell className="py-2 text-xs text-muted-foreground font-mono">{vSku}</TableCell>
                                            <TableCell className="py-2 text-xs text-right">{currencyFmt(v.price)}</TableCell>
                                            {columnView === "estoque" ? (
                                              <>
                                                <TableCell className="py-2 text-center">
                                                  <span className={`text-xs font-semibold ${v.available_quantity === 0 ? "text-destructive" : "text-foreground"}`}>
                                                    {v.available_quantity}
                                                  </span>
                                                </TableCell>
                                                <TableCell className="py-2" colSpan={2} />
                                              </>
                                            ) : (() => {
                                              const commRate = getCommissionRate(item.listing_type_id);
                                              const commPerUnit = Math.round(v.price * commRate * 100) / 100;
                                              const netPerUnit = Math.round((v.price - commPerUnit) * 100) / 100;
                                              const marginPct = v.price > 0 ? Math.round((netPerUnit / v.price) * 1000) / 10 : 0;
                                              const marginColor = marginPct >= 70 ? "text-emerald-600" : marginPct >= 50 ? "text-amber-600" : "text-red-600";
                                              return (
                                                <>
                                                  <TableCell className="py-2 text-xs text-right text-muted-foreground italic">—</TableCell>
                                                  <TableCell className="py-2 text-left">
                                                    {listingBadge(item.listing_type_id, commRate)}
                                                  </TableCell>
                                                  <TableCell className="py-2 text-xs text-right text-destructive font-mono">−{currencyFmt(commPerUnit)}</TableCell>
                                                  <TableCell className="py-2 text-right">
                                                    <span className={`text-xs font-bold ${marginColor}`}>{marginPct.toFixed(1)}%</span>
                                                  </TableCell>
                                                </>
                                              );
                                            })()}
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t text-xs text-muted-foreground">
                Exibindo {filtered.length} de {items.length} anúncios
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ═══════════════════ ABA RELATÓRIOS ═══════════════════ */}
      <TabsContent value="relatorios" className="space-y-5 mt-0">
        <Tabs defaultValue="ranking" className="space-y-4" onValueChange={(v) => setReportTab(v)}>
          <div className="flex items-center justify-between gap-3">
            <TabsList className="h-8">
              <TabsTrigger value="ranking" className="text-xs px-3 h-7">Ranking de Anúncios</TabsTrigger>
              <TabsTrigger value="marca" className="text-xs px-3 h-7">Análise por Marca</TabsTrigger>
              <TabsTrigger value="abc" className="text-xs px-3 h-7">Curva ABC</TabsTrigger>
            </TabsList>
            {reportTab === "ranking" && (
              <div className="flex items-center gap-2">
                <Select value={rankingBrandFilter} onValueChange={setRankingBrandFilter}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Filtrar por marca" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as marcas</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rankingBrandFilter !== "all" && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => setRankingBrandFilter("all")}>✕</Button>
                )}
              </div>
            )}
          </div>

          {/* ── Sub-aba Ranking ── */}
          <TabsContent value="ranking" className="mt-0 space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <KPICard title="Unidades Vendidas" value={String(rankingKPIs.totalUnits)} icon={<TrendingUp className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-accent/10 text-accent" />
              <KPICard title="Receita Total" value={currencyFmt(rankingKPIs.totalRev)} icon={<DollarSign className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-success/10 text-success" />
              <KPICard title="Ticket Médio" value={currencyFmt(rankingKPIs.avgTicket)} icon={<Tag className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]" />
            </div>

            <Card>
              <CardContent className="p-0">
                {loading && items.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Carregando...</p>
                  </div>
                ) : rankingFiltered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum dado disponível</p>
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-center">#</TableHead>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Anúncio</TableHead>
                          <TableHead className="text-right w-24">Preço</TableHead>
                          <TableHead className="text-right w-20">Vendidos</TableHead>
                          <TableHead className="text-right w-28">Receita</TableHead>
                          <TableHead className="text-center w-20">Estoque</TableHead>
                          <TableHead className="text-right w-20">% Part.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankingFiltered.map((r, idx) => (
                          <TableRow key={r.id} className={idx === 0 ? "bg-[hsl(45,93%,47%)]/5" : idx === 1 ? "bg-[hsl(0,0%,66%)]/5" : idx === 2 ? "bg-[hsl(25,60%,50%)]/5" : ""}>
                            <TableCell className="text-center text-sm font-bold">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                            </TableCell>
                            <TableCell className="p-2">
                              {r.thumbnail ? (
                                <img src={r.thumbnail.replace("http://", "https://")} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>
                              )}
                            </TableCell>
                            <TableCell>
                              <a href={`https://produto.mercadolivre.com.br/${r.id.replace(/^(MLB)(\d+)$/, "$1-$2")}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium line-clamp-2 leading-tight hover:underline hover:text-primary transition-colors">
                                {r.title} <ExternalLink className="w-3 h-3 inline mb-0.5 ml-0.5" />
                              </a>
                              <p className="text-xs text-muted-foreground mt-0.5">{r.id}</p>
                            </TableCell>
                            <TableCell className="text-right text-sm">{currencyFmt(r.price)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{r.sold}</TableCell>
                            <TableCell className="text-right text-sm font-semibold text-primary">{currencyFmt(r.revenue)}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-sm font-semibold ${r.stock === 0 ? "text-destructive" : ""}`}>{r.stock}</span>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{r.share.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {rankingFiltered.length > 0 && (
                  <div className="px-4 py-3 border-t text-xs text-muted-foreground">
                    {rankingFiltered.length} anúncios no ranking
                    {rankingBrandFilter !== "all" && ` · Marca: ${rankingBrandFilter}`}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Sub-aba Análise por Marca ── */}
          <TabsContent value="marca" className="mt-0 space-y-4">
            {/* KPIs */}
            {brandData.length > 0 && (() => {
              const topRevenue = brandData[0];
              const topTicket = [...brandData].filter((b) => b.qty > 0).sort((a, b) => b.avgTicket - a.avgTicket)[0];
              const topAds = [...brandData].sort((a, b) => b.ads - a.ads)[0];
              const topSold = [...brandData].sort((a, b) => b.qty - a.qty)[0];
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <KPICard title="Maior Receita" value={topRevenue.brand} subtitle={currencyFmt(topRevenue.revenue)} icon={<DollarSign className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-success/10 text-success" />
                  <KPICard title="Maior Ticket Médio" value={topTicket?.brand ?? "—"} subtitle={topTicket ? currencyFmt(topTicket.avgTicket) : "—"} icon={<Tag className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]" />
                  <KPICard title="Mais Vendida (un.)" value={topSold.brand} subtitle={`${topSold.qty} unidades`} icon={<TrendingUp className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-accent/10 text-accent" />
                  <KPICard title="Mais Anúncios" value={topAds.brand} subtitle={`${topAds.ads} anúncios`} icon={<ShoppingBag className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-[hsl(270,70%,50%)]/10 text-[hsl(270,70%,50%)]" />
                </div>
              );
            })()}
            {/* Charts */}
            {brandData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Receita por Marca (Top 10)</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart layout="vertical" data={brandBarData} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                        <RechartsTooltip
                          formatter={(value: number) => [currencyFmt(value), "Receita"]}
                          contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Distribuição de Vendas por Marca</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={brandPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={100}
                          paddingAngle={2}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                          fontSize={10}
                        >
                          {brandPieData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number, name: string) => [value, name]}
                          contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {loading && items.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Carregando...</p>
                  </div>
                ) : brandData.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum dado disponível</p>
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Marca</TableHead>
                          <TableHead className="text-center w-20">Anúncios</TableHead>
                          <TableHead className="text-right w-20">Vendidos</TableHead>
                          <TableHead className="w-48">Receita</TableHead>
                          <TableHead className="text-right w-24">TM</TableHead>
                          <TableHead className="text-center w-20">Estoque</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {brandData.map((b) => {
                          const pct = maxBrandRevenue > 0 ? (b.revenue / maxBrandRevenue) * 100 : 0;
                          return (
                            <TableRow key={b.brand}>
                              <TableCell className="text-sm font-medium">{b.brand}</TableCell>
                              <TableCell className="text-center text-sm">{b.ads}</TableCell>
                              <TableCell className="text-right text-sm">{b.qty}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <Progress value={pct} className="h-2" />
                                  </div>
                                  <span className="text-xs font-semibold text-primary whitespace-nowrap">{currencyFmt(b.revenue)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">{currencyFmt(b.avgTicket)}</TableCell>
                              <TableCell className="text-center text-sm">{b.stock}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {brandData.length > 0 && (
                  <div className="px-4 py-3 border-t text-xs text-muted-foreground">
                    {brandData.length} marcas encontradas
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Sub-aba Curva ABC ── */}
          <TabsContent value="abc" className="mt-0 space-y-4">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard title="Total de Anúncios" value={String(abcSummary.total)} icon={<ShoppingBag className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-accent/10 text-accent" />
              <KPICard title="Curva A" value={String(abcSummary.A.count)} subtitle={`${abcSummary.A.pct.toFixed(1)}% · ${currencyFmt(abcSummary.A.revenue)}`} icon={<TrendingUp className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-success/10 text-success" />
              <KPICard title="Curva B" value={String(abcSummary.B.count)} subtitle={`${abcSummary.B.pct.toFixed(1)}% · ${currencyFmt(abcSummary.B.revenue)}`} icon={<Package className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]" />
              <KPICard title="Curva C" value={String(abcSummary.C.count)} subtitle={`${abcSummary.C.pct.toFixed(1)}% · ${currencyFmt(abcSummary.C.revenue)}`} icon={<Tag className="w-4 h-4" />} variant="minimal" size="compact" iconClassName="bg-[hsl(270,70%,50%)]/10 text-[hsl(270,70%,50%)]" />
            </div>

            {/* ABC Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Curva ABC — Receita Acumulada</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {abcChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={abcChartData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="abcAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="rank" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} label={{ value: "Anúncios (posição)", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === "cumPct" ? "Acumulado" : "Participação"]}
                        labelFormatter={(label) => `Posição ${label}`}
                        contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      />
                      {/* Reference lines for 80% and 95% thresholds */}
                      <Area type="monotone" dataKey="cumPct" fill="url(#abcAreaGrad)" stroke="none" />
                      <Line type="monotone" dataKey="cumPct" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="cumPct" />
                      <Line type="monotone" dataKey="pct" stroke="hsl(var(--accent))" strokeWidth={1.5} dot={false} name="pct" strokeDasharray="4 3" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                )}
                <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground justify-center">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-primary rounded" /> % Acumulado</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-accent rounded" style={{ borderTop: "2px dashed" }} /> % Individual</div>
                  <div className="flex items-center gap-1.5"><span className="text-emerald-600 font-semibold">A</span> até 80%</div>
                  <div className="flex items-center gap-1.5"><span className="text-amber-600 font-semibold">B</span> 80–95%</div>
                  <div className="flex items-center gap-1.5"><span className="text-red-600 font-semibold">C</span> 95–100%</div>
                </div>
              </CardContent>
            </Card>

            {/* ABC Table */}
            <Card>
              <CardContent className="p-0">
                {abcData.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum dado disponível</p>
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-center">#</TableHead>
                          <TableHead className="w-16 text-center">Curva</TableHead>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Anúncio</TableHead>
                          <TableHead className="text-right w-24">Receita</TableHead>
                          <TableHead className="text-right w-16">% Ind.</TableHead>
                          <TableHead className="text-right w-20">% Acum.</TableHead>
                          <TableHead className="text-right w-20">Vendidos</TableHead>
                          <TableHead className="text-center w-20">Estoque</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {abcData.map((r) => (
                          <TableRow key={r.id} className={r.curve === "A" ? "bg-emerald-500/5" : r.curve === "B" ? "bg-amber-500/5" : ""}>
                            <TableCell className="text-center text-sm font-medium text-muted-foreground">{r.rank}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={
                                r.curve === "A" ? "border-emerald-500 text-emerald-600" :
                                r.curve === "B" ? "border-amber-500 text-amber-600" :
                                "border-destructive text-destructive"
                              }>{r.curve}</Badge>
                            </TableCell>
                            <TableCell className="p-2">
                              {r.thumbnail ? (
                                <img src={r.thumbnail.replace("http://", "https://")} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>
                              )}
                            </TableCell>
                            <TableCell>
                              <a href={`https://produto.mercadolivre.com.br/${r.id.replace(/^(MLB)(\d+)$/, "$1-$2")}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium line-clamp-2 leading-tight hover:underline hover:text-primary transition-colors">
                                {r.title} <ExternalLink className="w-3 h-3 inline mb-0.5 ml-0.5" />
                              </a>
                              <p className="text-xs text-muted-foreground mt-0.5">{r.brand} · {r.id}</p>
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-primary">{currencyFmt(r.revenue)}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{r.pct.toFixed(1)}%</TableCell>
                            <TableCell className="text-right text-sm font-medium">{r.cumPct.toFixed(1)}%</TableCell>
                            <TableCell className="text-right text-sm">{r.sold}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-sm font-semibold ${r.stock === 0 ? "text-destructive" : ""}`}>{r.stock}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {abcData.length > 0 && (
                  <div className="px-4 py-3 border-t text-xs text-muted-foreground">
                    {abcData.length} anúncios · A: {abcSummary.A.count} · B: {abcSummary.B.count} · C: {abcSummary.C.count}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
