import { useState, useMemo } from "react";
import { useMLInventory } from "@/contexts/MLInventoryContext";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { getMarketplaceInventory, getMarketplaceName } from "@/data/marketplaceMockData";
import { useMLCoverage, COVERAGE_PERIODS, COVERAGE_CLASS_LABELS } from "@/hooks/useMLCoverage";
import type { CoveragePeriod, CoverageClass, CoverageData } from "@/hooks/useMLCoverage";
import { CoverageAlerts } from "@/components/mercadolivre/CoverageAlerts";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package, PackageX, AlertTriangle, Boxes, RefreshCw, Search, ExternalLink, Plug,
  ChevronDown, ChevronRight, Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import type { ProductVariation } from "@/contexts/MLInventoryContext";

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type StockFilter = "all" | "in_stock" | "out";
type CoverageFilter = "all" | CoverageClass;
type SortBy = "coverage_asc" | "stock_asc" | "stock_desc" | "price_desc" | "price_asc" | "sold_desc" | "title";

const stockBadge = (qty: number) => {
  if (qty === 0) return <Badge variant="destructive" className="text-xs">Sem estoque</Badge>;
  if (qty <= 5) return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Baixo</Badge>;
  return <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">OK</Badge>;
};

const variationLabel = (v: ProductVariation) =>
  v.attribute_combinations.map((a) => a.value).join(" / ") || `Variação ${v.variation_id}`;

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

export default function MLEstoque() {
  const { items: mlItems, summary: mlSummary, loading: mlLoading, hasToken, lastUpdated, refresh } = useMLInventory();
  const { selectedMarketplace, activeMarketplace } = useMarketplace();
  const isML = selectedMarketplace === "mercado-livre" || selectedMarketplace === "all";

  const mockData = useMemo(() => !isML ? getMarketplaceInventory(selectedMarketplace) : null, [isML, selectedMarketplace]);
  const items = isML ? mlItems : (mockData?.items as any[] ?? []);
  const summary = isML ? mlSummary : (mockData?.summary ?? null);
  const loading = isML ? mlLoading : false;
  const marketplaceName = activeMarketplace ? activeMarketplace.name : "Mercado Livre";
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("coverage_asc");
  const [coveragePeriod, setCoveragePeriod] = useState<CoveragePeriod>("monthly");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hideOutOfStock, setHideOutOfStock] = useState(true);

  const inventoryForCoverage = useMemo(
    () => items.map((i) => ({ id: i.id, available_quantity: i.available_quantity })),
    [items],
  );

  const { coverageMap, stats, loading: coverageLoading } = useMLCoverage(
    inventoryForCoverage,
    coveragePeriod,
  );

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.id.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;
        if (hideOutOfStock && item.available_quantity === 0) return false;
        if (stockFilter === "out" && item.available_quantity !== 0) return false;
        if (stockFilter === "in_stock" && item.available_quantity === 0) return false;
        if (coverageFilter !== "all") {
          const c = coverageMap.get(item.id);
          if (!c || c.coverage_class !== coverageFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "coverage_asc") {
          const ca = coverageMap.get(a.id);
          const cb = coverageMap.get(b.id);
          const da = ca?.coverage_class === "sem_giro" ? 999999 : (ca?.coverage_days ?? 999998);
          const db = cb?.coverage_class === "sem_giro" ? 999999 : (cb?.coverage_days ?? 999998);
          return da - db;
        }
        if (sortBy === "stock_asc") return a.available_quantity - b.available_quantity;
        if (sortBy === "stock_desc") return b.available_quantity - a.available_quantity;
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "sold_desc") return b.sold_quantity - a.sold_quantity;
        return a.title.localeCompare(b.title);
      });
  }, [items, search, hideOutOfStock, stockFilter, coverageFilter, sortBy, coverageMap]);

  if (hasToken === false) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Plug className="w-12 h-12 mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold mb-2">Conta não conectada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Conecte sua conta do Mercado Livre para visualizar o estoque.
            </p>
            <Button asChild>
              <Link to="/integracoes">Ir para Integrações</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MLPageHeader title="Estoque" lastUpdated={lastUpdated}>
        <Button onClick={refresh} disabled={loading} size="sm" variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </MLPageHeader>

      {/* Period Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Cobertura baseada em:</span>
        </div>
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
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !summary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KPICard
              title="Anúncios Ativos"
              value={summary ? String(summary.totalItems) : "—"}
              icon={<Boxes className="w-5 h-5" />}
              subtitle="Total listados"
            />
            <KPICard
              title="Cobertura Média"
              value={coverageLoading ? "…" : stats.avg_coverage !== null ? `${stats.avg_coverage} dias` : "—"}
              icon={<Clock className="w-5 h-5" />}
              subtitle={`Base ${COVERAGE_PERIODS.find((p) => p.value === coveragePeriod)?.label.toLowerCase()}`}
              variant="info"
            />
            <KPICard
              title="Críticos"
              value={coverageLoading ? "…" : String(stats.ruptura + stats.critico)}
              icon={<PackageX className="w-5 h-5" />}
              subtitle="Ruptura ou < 7 dias"
              variant={stats.ruptura + stats.critico > 0 ? "danger" : "default"}
            />
            <KPICard
              title="Em Alerta"
              value={coverageLoading ? "…" : String(stats.alerta)}
              icon={<AlertTriangle className="w-5 h-5" />}
              subtitle="7 a 30 dias"
              variant={stats.alerta > 0 ? "warning" : "default"}
            />
          </>
        )}
      </div>

      {/* Alerta de Ruptura */}
      {!coverageLoading && coverageMap.size > 0 && (
        <CoverageAlerts items={items} coverageMap={coverageMap} />
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Anúncios</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Hide out of stock toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                <Checkbox
                  checked={hideOutOfStock}
                  onCheckedChange={(v) => setHideOutOfStock(!!v)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">Ocultar sem estoque</span>
              </label>

              {/* Search */}
              <div className="relative flex-1 sm:w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título ou ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Stock filter */}
              <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="in_stock">Com estoque</SelectItem>
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
                  <SelectItem value="coverage_asc">Menor cobertura</SelectItem>
                  <SelectItem value="stock_asc">Menor estoque</SelectItem>
                  <SelectItem value="stock_desc">Maior estoque</SelectItem>
                  <SelectItem value="sold_desc">Mais vendidos</SelectItem>
                  <SelectItem value="price_desc">Maior preço</SelectItem>
                  <SelectItem value="price_asc">Menor preço</SelectItem>
                  <SelectItem value="title">A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Carregando estoque...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{search || stockFilter !== "all" || coverageFilter !== "all" ? "Nenhum anúncio encontrado" : "Nenhum anúncio ativo"}</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Anúncio</TableHead>
                    <TableHead className="text-right w-28">Preço</TableHead>
                    <TableHead className="text-center w-24">Disponível</TableHead>
                    <TableHead className="text-center w-20">Vendidos</TableHead>
                    <TableHead className="text-center w-32">Cobertura</TableHead>
                    <TableHead className="text-center w-24">Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const isExpanded = expandedRows.has(item.id);
                    const coverage = coverageMap.get(item.id);
                    const priceMin = item.has_variations ? Math.min(...item.variations.map((v) => v.price)) : item.price;
                    const priceMax = item.has_variations ? Math.max(...item.variations.map((v) => v.price)) : item.price;
                    const priceLabel =
                      item.has_variations && priceMin !== priceMax
                        ? `${currencyFmt(priceMin)} – ${currencyFmt(priceMax)}`
                        : currencyFmt(item.price);
                    const coverageTooltip = coverage
                      ? `${coverage.avg_daily_sales.toFixed(1)} unid/dia · ${COVERAGE_PERIODS.find((p) => p.value === coveragePeriod)?.description}`
                      : undefined;

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

                          <TableCell className="p-2">
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
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground">{item.id}</p>
                              {item.has_variations && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {item.variations.length} variações
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right text-sm font-medium whitespace-nowrap">{priceLabel}</TableCell>

                          <TableCell className="text-center">
                            <span className={`text-sm font-semibold ${item.available_quantity === 0 ? "text-destructive" : item.available_quantity <= 5 ? "text-amber-600" : "text-foreground"}`}>
                              {item.available_quantity}
                            </span>
                          </TableCell>

                          <TableCell className="text-center text-sm text-muted-foreground">{item.sold_quantity}</TableCell>

                          <TableCell className="text-center">
                            <CoverageChip data={coverage} title={coverageTooltip} />
                          </TableCell>

                          <TableCell className="text-center">{stockBadge(item.available_quantity)}</TableCell>

                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`https://produto.mercadolivre.com.br/${item.id.replace(/^(MLB)(\d+)$/, "$1-$2")}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </TableCell>
                        </TableRow>

                        {/* Variation sub-table */}
                        {item.has_variations && isExpanded && (
                          <TableRow key={`${item.id}-variations`}>
                            <TableCell colSpan={9} className="p-0 bg-muted/20 border-b">
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
                                    {(hideOutOfStock ? item.variations.filter(v => v.available_quantity > 0) : item.variations).map((v) => {
                                      const parentAvg = coverage?.avg_daily_sales ?? 0;
                                      const varShare =
                                        item.available_quantity > 0
                                          ? v.available_quantity / item.available_quantity
                                          : 1 / item.variations.length;
                                      const varAvg = parentAvg * varShare;
                                      const varCoverageDays = varAvg > 0 ? Math.floor(v.available_quantity / varAvg) : null;
                                      const varClass =
                                        v.available_quantity === 0 ? "ruptura"
                                        : varCoverageDays === null ? "sem_giro"
                                        : varCoverageDays < 7 ? "critico"
                                        : varCoverageDays < 30 ? "alerta"
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
            <div className="px-4 py-3 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>Exibindo {filtered.length} de {items.length} anúncios</span>
              {coverageFilter !== "all" && (
                <span className="text-muted-foreground/60">
                  Filtrado por: {COVERAGE_CLASS_LABELS[coverageFilter as CoverageClass]}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
