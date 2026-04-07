import { useState, useMemo } from "react";
import { useMLInventory } from "@/contexts/MLInventoryContext";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingBag, RefreshCw, Search, ExternalLink, Plug, DollarSign, Tag, TrendingUp, Package,
  ChevronDown, ChevronRight, Receipt, LayoutGrid,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TopSellingProducts, type ProductSalesRow } from "@/components/mercadolivre/TopSellingProducts";
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

type StatusFilter = "all" | "active" | "paused";
type StockFilter = "all" | "in_stock" | "low" | "out";
type SortBy = "sold" | "price_desc" | "price_asc" | "title";
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

// ─── Brand extraction from title ──────────────────────────────────────────────
function extractBrand(title: string): string {
  const words = title.trim().split(/\s+/);
  return words[0] || "Outros";
}

export default function MLProdutos() {
  const { items, loading, hasToken, lastUpdated, refresh } = useMLInventory();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("title");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [columnView, setColumnView] = useState<ColumnView>("estoque");
  const [brandFilter, setBrandFilter] = useState("all");

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
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "sold") return b.sold_quantity - a.sold_quantity;
        return a.title.localeCompare(b.title);
      });
  }, [items, search, statusFilter, stockFilter, sortBy, brandFilter]);

  // ─── Reports data ───────────────────────────────────────────────────────────
  const rankingProducts: ProductSalesRow[] = useMemo(
    () =>
      items
        .sort((a, b) => b.sold_quantity - a.sold_quantity)
        .slice(0, 10)
        .map((i) => ({
          item_id: i.id,
          title: i.title,
          thumbnail: i.thumbnail,
          qty_sold: i.sold_quantity,
          revenue: i.sold_quantity * i.price,
          available_quantity: i.available_quantity,
        })),
    [items],
  );

  const brandData = useMemo(() => {
    const map = new Map<string, { revenue: number; qty: number }>();
    items.forEach((i) => {
      const brand = extractBrand(i.title);
      const prev = map.get(brand) ?? { revenue: 0, qty: 0 };
      map.set(brand, { revenue: prev.revenue + i.sold_quantity * i.price, qty: prev.qty + i.sold_quantity });
    });
    return Array.from(map.entries())
      .map(([brand, d]) => ({ brand, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [items]);

  const maxBrandRevenue = brandData.length > 0 ? brandData[0].revenue : 1;

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

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                  <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
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
                      <TableHead>Anúncio</TableHead>
                      <TableHead className="text-left w-24">Marca</TableHead>
                      <TableHead className="text-left w-20">SKU</TableHead>
                      <TableHead className="text-right w-24">Preço</TableHead>
                      {columnView === "estoque" ? (
                        <>
                          <TableHead className="text-right w-24">Custo</TableHead>
                          <TableHead className="text-center w-20">Estoque</TableHead>
                          <TableHead className="text-center w-20">Saúde</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-left w-36">Tipo / Comissão</TableHead>
                          <TableHead className="text-right w-32">Comissão/unid.</TableHead>
                          <TableHead className="text-right w-32">Líq./unid. est.</TableHead>
                          <TableHead className="text-right w-28">Margem est.</TableHead>
                          <TableHead className="text-right w-32">Líq. total est.</TableHead>
                        </>
                      )}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => {
                      const soldRevenue = item.sold_quantity * item.price;
                      const isExpanded = expandedRows.has(item.id);
                      const sku = (item as any).seller_custom_field || "—";

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
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-muted-foreground">{item.id}</p>
                                {item.has_variations && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {item.variations.length} variações
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-left text-xs text-muted-foreground">{item.brand || "—"}</TableCell>
                            <TableCell className="text-left text-xs text-muted-foreground font-mono">{sku}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{currencyFmt(item.price)}</TableCell>

                            {columnView === "estoque" ? (
                              <>
                                <TableCell className="text-right text-xs text-muted-foreground italic">A informar</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`text-sm font-semibold ${item.available_quantity === 0 ? "text-destructive" : "text-foreground"}`}>
                                      {item.available_quantity}
                                    </span>
                                    {stockBadge(item.available_quantity)}
                                  </div>
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
                                  <TableCell className="text-left text-xs text-muted-foreground">
                                    {getListingLabel(item.listing_type_id)} · {(commRate * 100).toFixed(1)}%
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-destructive font-mono">−{currencyFmt(commPerUnit)}</TableCell>
                                  <TableCell className="text-right text-sm font-medium font-mono">{currencyFmt(netPerUnit)}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={`text-sm font-bold ${marginColor}`}>{marginPct.toFixed(1)}%</span>
                                  </TableCell>
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
                              <TableCell colSpan={columnView === "estoque" ? 10 : 13} className="p-0 bg-muted/20 border-b">
                                <div className="px-10 py-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-b border-border/50">
                                        <TableHead className="text-xs h-8 font-medium">Variação</TableHead>
                                        <TableHead className="text-xs h-8 font-medium text-left">SKU</TableHead>
                                        <TableHead className="text-xs h-8 font-medium text-right">Preço</TableHead>
                                        {columnView === "estoque" ? (
                                          <>
                                            <TableHead className="text-xs h-8 font-medium text-right">Custo</TableHead>
                                            <TableHead className="text-xs h-8 font-medium text-center">Estoque</TableHead>
                                            <TableHead className="text-xs h-8 font-medium text-center">Saúde</TableHead>
                                          </>
                                        ) : (
                                          <>
                                            <TableHead className="text-xs h-8 font-medium text-right">Comissão %</TableHead>
                                            <TableHead className="text-xs h-8 font-medium text-right">Comissão/unid.</TableHead>
                                            <TableHead className="text-xs h-8 font-medium text-right">Líq./unid. est.</TableHead>
                                            <TableHead className="text-xs h-8 font-medium text-right">Margem est.</TableHead>
                                            <TableHead className="text-xs h-8 font-medium text-right">Vendidos R$</TableHead>
                                            <TableHead className="text-xs h-8 font-medium text-right">Líq. total est.</TableHead>
                                          </>
                                        )}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {item.variations.map((v) => {
                                        const vSku = (v as any).seller_custom_field || "—";
                                        return (
                                          <TableRow key={v.variation_id} className="border-b border-border/30 last:border-0">
                                            <TableCell className="py-2 text-xs font-medium">{variationLabel(v)}</TableCell>
                                            <TableCell className="py-2 text-xs text-muted-foreground font-mono">{vSku}</TableCell>
                                            <TableCell className="py-2 text-xs text-right">{currencyFmt(v.price)}</TableCell>
                                            {columnView === "estoque" ? (
                                              <>
                                                <TableCell className="py-2 text-xs text-right text-muted-foreground italic">—</TableCell>
                                                <TableCell className="py-2 text-center">
                                                  <div className="flex flex-col items-center gap-0.5">
                                                    <span className={`text-xs font-semibold ${v.available_quantity === 0 ? "text-destructive" : "text-foreground"}`}>
                                                      {v.available_quantity}
                                                    </span>
                                                    {stockBadge(v.available_quantity)}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="py-2 text-center">—</TableCell>
                                              </>
                                            ) : (() => {
                                              const commRate = getCommissionRate(item.listing_type_id);
                                              const commPerUnit = Math.round(v.price * commRate * 100) / 100;
                                              const netPerUnit = Math.round((v.price - commPerUnit) * 100) / 100;
                                              const marginPct = v.price > 0 ? Math.round((netPerUnit / v.price) * 1000) / 10 : 0;
                                              const vRevenue = v.sold_quantity * v.price;
                                              const totalNet = Math.round(netPerUnit * v.sold_quantity * 100) / 100;
                                              const marginColor = marginPct >= 70 ? "text-emerald-600" : marginPct >= 50 ? "text-amber-600" : "text-red-600";
                                              return (
                                                <>
                                                  <TableCell className="py-2 text-xs text-right">{(commRate * 100).toFixed(1)}%</TableCell>
                                                  <TableCell className="py-2 text-xs text-right text-destructive font-mono">−{currencyFmt(commPerUnit)}</TableCell>
                                                  <TableCell className="py-2 text-xs text-right font-mono">{currencyFmt(netPerUnit)}</TableCell>
                                                  <TableCell className="py-2 text-right">
                                                    <span className={`text-xs font-bold ${marginColor}`}>{marginPct.toFixed(1)}%</span>
                                                  </TableCell>
                                                  <TableCell className="py-2 text-xs text-right">{currencyFmt(vRevenue)}</TableCell>
                                                  <TableCell className="py-2 text-xs text-right font-mono">{currencyFmt(totalNet)}</TableCell>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Ranking de Produtos */}
          <TopSellingProducts products={rankingProducts} loading={loading && items.length === 0} />

          {/* Vendas por Marca */}
          <Card className="h-full flex flex-col">
            <div className="px-4 pt-4 pb-2">
              <span className="text-sm font-medium text-foreground">Vendas por Marca</span>
            </div>
            <CardContent className="flex-1 p-4 pt-0">
              {loading && items.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
                      <div className="h-5 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : brandData.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground text-sm py-8">
                  <Package className="w-8 h-8 mb-2 opacity-50" />
                  Nenhum dado disponível
                </div>
              ) : (
                <div className="space-y-3">
                  {brandData.map((b, idx) => {
                    const pct = maxBrandRevenue > 0 ? (b.revenue / maxBrandRevenue) * 100 : 0;
                    return (
                      <div key={b.brand}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate max-w-[60%]">{b.brand}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">{b.qty} un.</span>
                            <span className="text-xs font-semibold text-primary">{currencyFmt(b.revenue)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
