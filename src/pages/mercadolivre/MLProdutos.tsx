import { useState, useMemo } from "react";
import { useMLInventory } from "@/contexts/MLInventoryContext";
import { useMLCoverage, COVERAGE_PERIODS, COVERAGE_CLASS_LABELS } from "@/hooks/useMLCoverage";
import type { CoveragePeriod, CoverageClass, CoverageData } from "@/hooks/useMLCoverage";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingBag, RefreshCw, Search, ExternalLink, Plug, DollarSign, Tag, TrendingUp, Package,
  ChevronDown, ChevronRight, Clock, Receipt, LayoutGrid,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

type StockFilter = "all" | "in_stock" | "low" | "out";
type CoverageFilter = "all" | CoverageClass;
type SortBy = "price_desc" | "price_asc" | "sold" | "title" | "coverage_asc";
type ColumnView = "estoque" | "financeiro";

const healthBadge = (health: number | null) => {
  if (health === null) return <span className="text-xs text-muted-foreground">—</span>;
  if (health >= 0.8) return <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">Ótima</Badge>;
  if (health >= 0.5) return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Regular</Badge>;
  return <Badge variant="destructive" className="text-xs">Baixa</Badge>;
};

const stockBadge = (qty: number) => {
  if (qty === 0) return <Badge variant="destructive" className="text-xs">Sem estoque</Badge>;
  if (qty <= 5) return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Baixo</Badge>;
  return <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">OK</Badge>;
};

const variationLabel = (v: ProductVariation) =>
  v.attribute_combinations.map((a) => a.value).join(" / ") || `Var. ${v.variation_id}`;

const MAX_PILLS = 5;

function CoverageChip({ data, title }: { data: CoverageData | undefined; title?: string }) {
  if (!data) return <span className="text-xs text-muted-foreground">—</span>;
  if (data.coverage_class === "ruptura")
    return <Badge variant="destructive" className="text-[10px]">Ruptura</Badge>;
  if (data.coverage_class === "sem_giro")
    return <span className="text-xs text-muted-foreground" title={title}>Sem giro</span>;
  const cls =
    data.coverage_class === "critico"
      ? "border-orange-500 text-orange-600"
      : data.coverage_class === "alerta"
      ? "border-amber-500 text-amber-600"
      : "border-emerald-500 text-emerald-600";
  return (
    <Badge variant="outline" className={`text-[10px] ${cls}`} title={title}>
      {data.coverage_days}d
    </Badge>
  );
}

export default function MLProdutos() {
  const { items, loading, hasToken, lastUpdated, refresh } = useMLInventory();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("sold");
  const [coveragePeriod, setCoveragePeriod] = useState<CoveragePeriod>("monthly");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [columnView, setColumnView] = useState<ColumnView>("estoque");

  const inventoryForCoverage = useMemo(
    () => items.map((i) => ({ id: i.id, available_quantity: i.available_quantity })),
    [items],
  );

  const { coverageMap } = useMLCoverage(inventoryForCoverage, coveragePeriod);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
        if (stockFilter === "out" && item.available_quantity !== 0) return false;
        if (stockFilter === "low" && !(item.available_quantity > 0 && item.available_quantity <= 5)) return false;
        if (stockFilter === "in_stock" && item.available_quantity === 0) return false;
        if (coverageFilter !== "all") {
          const c = coverageMap.get(item.id);
          if (!c || c.coverage_class !== coverageFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "sold") return b.sold_quantity - a.sold_quantity;
        if (sortBy === "coverage_asc") {
          const ca = coverageMap.get(a.id);
          const cb = coverageMap.get(b.id);
          const da = ca?.coverage_class === "sem_giro" ? 999999 : (ca?.coverage_days ?? 999998);
          const db = cb?.coverage_class === "sem_giro" ? 999999 : (cb?.coverage_days ?? 999998);
          return da - db;
        }
        return a.title.localeCompare(b.title);
      });
  }, [items, search, stockFilter, coverageFilter, sortBy, coverageMap]);

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
    <div className="space-y-5">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 -mx-8 px-8 pb-3 pt-1 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center justify-between gap-4">
          <MLPageHeader title="Anúncios" lastUpdated={lastUpdated} />
          <div className="flex items-center gap-2 flex-wrap">
            {/* Coverage period selector */}
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              {COVERAGE_PERIODS.map((p) => (
                <button
                  key={p.value}
                  title={p.description}
                  onClick={() => setCoveragePeriod(p.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    coveragePeriod === p.value
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button onClick={refresh} disabled={loading} size="sm" variant="outline" className="h-8">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

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
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Catálogo de Anúncios</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Search */}
              <div className="relative flex-1 sm:w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>

              {/* Stock filter */}
              <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="in_stock">Com estoque</SelectItem>
                  <SelectItem value="low">Estoque baixo</SelectItem>
                  <SelectItem value="out">Sem estoque</SelectItem>
                </SelectContent>
              </Select>

              {/* Coverage class filter */}
              <Select value={coverageFilter} onValueChange={(v) => setCoverageFilter(v as CoverageFilter)}>
                <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Cobertura" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda cobertura</SelectItem>
                  {(Object.keys(COVERAGE_CLASS_LABELS) as CoverageClass[]).map((k) => (
                    <SelectItem key={k} value={k}>{COVERAGE_CLASS_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sold">Mais vendidos</SelectItem>
                  <SelectItem value="coverage_asc">Menor cobertura</SelectItem>
                  <SelectItem value="price_desc">Maior preço</SelectItem>
                  <SelectItem value="price_asc">Menor preço</SelectItem>
                  <SelectItem value="title">A–Z</SelectItem>
                </SelectContent>
              </Select>

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
                      <Receipt className="w-3.5 h-3.5" /> Financeiro
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Alternar visão de colunas</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Carregando anúncios...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{search || stockFilter !== "all" || coverageFilter !== "all" ? "Nenhum produto encontrado" : "Nenhum produto ativo"}</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Anúncio</TableHead>
                    <TableHead className="text-right w-24">Preço</TableHead>
                    {columnView === "estoque" ? (
                      <>
                        <TableHead className="text-center w-20">Estoque</TableHead>
                        <TableHead className="text-center w-20">Vendidos</TableHead>
                        <TableHead className="text-right w-28">Vendidos R$</TableHead>
                        <TableHead className="text-center w-20">% Part.</TableHead>
                        <TableHead className="text-center w-20">Visitas</TableHead>
                        <TableHead className="text-center w-20">Conv.</TableHead>
                        <TableHead className="text-center w-28">Cobertura</TableHead>
                        <TableHead className="text-center w-20">Saúde</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-left w-24">Tipo ML</TableHead>
                        <TableHead className="text-right w-28">Comissão %</TableHead>
                        <TableHead className="text-right w-32">Comissão/unid.</TableHead>
                        <TableHead className="text-right w-32">Líq./unid. est.</TableHead>
                        <TableHead className="text-right w-28">Margem est.</TableHead>
                        <TableHead className="text-right w-28">Vendidos R$</TableHead>
                        <TableHead className="text-right w-32">Líq. total est.</TableHead>
                      </>
                    )}
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const soldRevenue = item.sold_quantity * item.price;
                    const participation = totalSoldRevenue > 0 ? (soldRevenue / totalSoldRevenue) * 100 : 0;
                    const conversion = item.visits > 0 ? (item.sold_quantity / item.visits) * 100 : 0;
                    const isExpanded = expandedRows.has(item.id);
                    const coverage = coverageMap.get(item.id);
                    const coverageTooltip = coverage
                      ? `${coverage.avg_daily_sales.toFixed(1)} unid/dia · ${COVERAGE_PERIODS.find((p) => p.value === coveragePeriod)?.description}`
                      : undefined;

                    const visiblePills = item.has_variations ? item.variations.slice(0, MAX_PILLS) : [];
                    const extraPills = item.has_variations ? item.variations.length - MAX_PILLS : 0;

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
                            <p className="text-sm font-medium line-clamp-2 leading-tight">{item.title}</p>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <p className="text-xs text-muted-foreground">{item.id}</p>
                              {item.has_variations && (
                                <>
                                  <span className="text-muted-foreground/40 text-xs">·</span>
                                  {visiblePills.map((v) => (
                                    <span key={v.variation_id} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">
                                      {variationLabel(v)}
                                    </span>
                                  ))}
                                  {extraPills > 0 && (
                                    <span className="text-[10px] text-muted-foreground">+{extraPills}</span>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right text-sm font-medium">{currencyFmt(item.price)}</TableCell>
                          {columnView === "estoque" ? (
                            <>
                              <TableCell className="text-center">
                                <span className={`text-sm font-semibold ${item.available_quantity === 0 ? "text-destructive" : "text-foreground"}`}>
                                  {item.available_quantity}
                                </span>
                              </TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">{item.sold_quantity}</TableCell>
                              <TableCell className="text-right text-sm font-medium">{currencyFmt(soldRevenue)}</TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">{participation.toFixed(1)}%</TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">{item.visits.toLocaleString("pt-BR")}</TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">{conversion.toFixed(1)}%</TableCell>
                              <TableCell className="text-center">
                                <CoverageChip data={coverage} title={coverageTooltip} />
                              </TableCell>
                              <TableCell className="text-center">{healthBadge(item.health)}</TableCell>
                            </>
                          ) : (() => {
                            const commRate = getCommissionRate(item.listing_type_id);
                            const commPerUnit = Math.round(item.price * commRate * 100) / 100;
                            const netPerUnit = Math.round((item.price - commPerUnit) * 100) / 100;
                            const marginPct = item.price > 0 ? Math.round((netPerUnit / item.price) * 1000) / 10 : 0;
                            const totalNet = Math.round(netPerUnit * item.sold_quantity * 100) / 100;
                            const marginColor = marginPct >= 70 ? "text-emerald-600" : marginPct >= 50 ? "text-amber-600" : "text-red-600";
                            return (
                              <>
                                <TableCell className="text-left text-xs text-muted-foreground">{getListingLabel(item.listing_type_id)}</TableCell>
                                <TableCell className="text-right text-sm">{(commRate * 100).toFixed(1)}%</TableCell>
                                <TableCell className="text-right text-sm text-destructive font-mono">−{currencyFmt(commPerUnit)}</TableCell>
                                <TableCell className="text-right text-sm font-medium font-mono">{currencyFmt(netPerUnit)}</TableCell>
                                <TableCell className="text-right">
                                  <span className={`text-sm font-bold ${marginColor}`}>{marginPct.toFixed(1)}%</span>
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium">{currencyFmt(soldRevenue)}</TableCell>
                                <TableCell className="text-right text-sm font-semibold font-mono">{currencyFmt(totalNet)}</TableCell>
                              </>
                            );
                          })()}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <a href={`https://produto.mercadolivre.com.br/${item.id.replace(/^(MLB)(\d+)$/, "$1-$2")}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </TableCell>
                        </TableRow>

                        {/* Expanded variations sub-table */}
                        {item.has_variations && isExpanded && (
                          <TableRow key={`${item.id}-variations`}>
                            <TableCell colSpan={13} className="p-0 bg-muted/20 border-b">
                              <div className="px-10 py-3">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-b border-border/50">
                                      <TableHead className="text-xs h-8 font-medium">Variação</TableHead>
                                      <TableHead className="text-xs h-8 font-medium text-right">Preço</TableHead>
                                      <TableHead className="text-xs h-8 font-medium text-center">Disponível</TableHead>
                                      <TableHead className="text-xs h-8 font-medium text-center">Vendidos</TableHead>
                                      <TableHead className="text-xs h-8 font-medium text-center">Cobertura Est.</TableHead>
                                      <TableHead className="text-xs h-8 font-medium text-center">Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {item.variations.map((v) => {
                                      const parentAvg = coverage?.avg_daily_sales ?? 0;
                                      const varShare =
                                        item.available_quantity > 0
                                          ? v.available_quantity / item.available_quantity
                                          : 1 / item.variations.length;
                                      const varAvg = parentAvg * varShare;
                                      const varCoverageDays =
                                        varAvg > 0 ? Math.floor(v.available_quantity / varAvg) : null;
                                      const varClass =
                                        v.available_quantity === 0
                                          ? "ruptura"
                                          : varCoverageDays === null
                                          ? "sem_giro"
                                          : varCoverageDays < 7
                                          ? "critico"
                                          : varCoverageDays < 30
                                          ? "alerta"
                                          : "ok";
                                      return (
                                        <TableRow key={v.variation_id} className="border-b border-border/30 last:border-0">
                                          <TableCell className="py-2 text-xs font-medium">{variationLabel(v)}</TableCell>
                                          <TableCell className="py-2 text-xs text-right">{currencyFmt(v.price)}</TableCell>
                                          <TableCell className="py-2 text-center">
                                            <span className={`text-xs font-semibold ${v.available_quantity === 0 ? "text-destructive" : v.available_quantity <= 5 ? "text-amber-600" : "text-foreground"}`}>
                                              {v.available_quantity}
                                            </span>
                                          </TableCell>
                                          <TableCell className="py-2 text-xs text-center text-muted-foreground">{v.sold_quantity}</TableCell>
                                          <TableCell className="py-2 text-center">
                                            <CoverageChip
                                              data={{ avg_daily_sales: varAvg, coverage_days: varCoverageDays, coverage_class: varClass as any, total_sold: 0 }}
                                              title="Estimativa proporcional ao estoque total"
                                            />
                                          </TableCell>
                                          <TableCell className="py-2 text-center">{stockBadge(v.available_quantity)}</TableCell>
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
    </div>
  );
}
