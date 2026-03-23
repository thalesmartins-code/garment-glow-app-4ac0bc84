import { useState } from "react";
import { useMLInventory } from "@/contexts/MLInventoryContext";
import { Checkbox } from "@/components/ui/checkbox";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package, PackageX, AlertTriangle, Boxes, RefreshCw, Search, ExternalLink, Plug, ChevronDown, ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import type { ProductVariation } from "@/contexts/MLInventoryContext";

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const stockBadge = (qty: number) => {
  if (qty === 0) return <Badge variant="destructive" className="text-xs">Sem estoque</Badge>;
  if (qty <= 5) return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Baixo</Badge>;
  return <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">OK</Badge>;
};

const variationLabel = (v: ProductVariation) =>
  v.attribute_combinations.map((a) => a.value).join(" / ") || `Variação ${v.variation_id}`;

export default function MLEstoque() {
  const { items, summary, loading, hasToken, lastUpdated, refresh } = useMLInventory();
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hideOutOfStock, setHideOutOfStock] = useState(false);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !summary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : summary ? (
          <>
            <KPICard title="Anúncios Ativos" value={String(summary.totalItems)} icon={<Boxes className="w-5 h-5" />} subtitle="Total de anúncios listados" />
            <KPICard title="Unidades em Estoque" value={String(summary.totalStock)} icon={<Package className="w-5 h-5" />} subtitle="Disponível para venda" />
            <KPICard title="Sem Estoque" value={String(summary.outOfStock)} icon={<PackageX className="w-5 h-5" />} subtitle="Anúncios esgotados" variant={summary.outOfStock > 0 ? "danger" : "default"} />
            <KPICard title="Estoque Baixo" value={String(summary.lowStock)} icon={<AlertTriangle className="w-5 h-5" />} subtitle="≤ 5 unidades" variant={summary.lowStock > 0 ? "warning" : "default"} />
          </>
        ) : null}
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Anúncios</CardTitle>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={hideOutOfStock}
                  onCheckedChange={(v) => setHideOutOfStock(!!v)}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">Ocultar sem estoque</span>
              </label>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título ou ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
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
              <p className="text-sm">{search ? "Nenhum anúncio encontrado" : "Nenhum anúncio ativo"}</p>
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
                    <TableHead className="text-center w-28">Disponível</TableHead>
                    <TableHead className="text-center w-24">Vendidos</TableHead>
                    <TableHead className="text-center w-24">Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const isExpanded = expandedRows.has(item.id);
                    const priceMin = item.has_variations
                      ? Math.min(...item.variations.map((v) => v.price))
                      : item.price;
                    const priceMax = item.has_variations
                      ? Math.max(...item.variations.map((v) => v.price))
                      : item.price;
                    const priceLabel =
                      item.has_variations && priceMin !== priceMax
                        ? `${currencyFmt(priceMin)} – ${currencyFmt(priceMax)}`
                        : currencyFmt(item.price);

                    return (
                      <>
                        <TableRow
                          key={item.id}
                          className={item.has_variations ? "cursor-pointer hover:bg-muted/50" : ""}
                          onClick={() => item.has_variations && toggleRow(item.id)}
                        >
                          {/* Expand toggle */}
                          <TableCell className="p-1 pl-3">
                            {item.has_variations ? (
                              isExpanded
                                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            ) : null}
                          </TableCell>

                          {/* Thumbnail */}
                          <TableCell className="p-2">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail.replace("http://", "https://")}
                                alt=""
                                className="w-10 h-10 rounded object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>

                          {/* Title */}
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

                          {/* Price */}
                          <TableCell className="text-right text-sm font-medium whitespace-nowrap">
                            {priceLabel}
                          </TableCell>

                          {/* Stock */}
                          <TableCell className="text-center">
                            <span className={`text-sm font-semibold ${item.available_quantity === 0 ? "text-destructive" : item.available_quantity <= 5 ? "text-amber-600" : "text-foreground"}`}>
                              {item.available_quantity}
                            </span>
                          </TableCell>

                          {/* Sold */}
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {item.sold_quantity}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center">
                            {stockBadge(item.available_quantity)}
                          </TableCell>

                          {/* Link */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`https://produto.mercadolivre.com.br/${item.id.replace(/^(MLB)(\d+)$/, "$1-$2")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </TableCell>
                        </TableRow>

                        {/* Expanded variations sub-table */}
                        {item.has_variations && isExpanded && (
                          <TableRow key={`${item.id}-variations`}>
                            <TableCell colSpan={8} className="p-0 bg-muted/20 border-b">
                              <div className="px-10 py-3">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-b border-border/50">
                                      <TableHead className="text-xs h-8 font-medium">Variação</TableHead>
                                      <TableHead className="text-xs h-8 font-medium text-right">Preço</TableHead>
                                      <TableHead className="text-xs h-8 font-medium text-center">Disponível</TableHead>
                                      <TableHead className="text-xs h-8 font-medium text-center">Vendidos</TableHead>
                                      <TableHead className="text-xs h-8 font-medium text-center">Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(hideOutOfStock ? item.variations.filter(v => v.available_quantity > 0) : item.variations).map((v) => (
                                      <TableRow key={v.variation_id} className="border-b border-border/30 last:border-0">
                                        <TableCell className="py-2 text-xs font-medium">
                                          {variationLabel(v)}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs text-right">
                                          {currencyFmt(v.price)}
                                        </TableCell>
                                        <TableCell className="py-2 text-center">
                                          <span className={`text-xs font-semibold ${v.available_quantity === 0 ? "text-destructive" : v.available_quantity <= 5 ? "text-amber-600" : "text-foreground"}`}>
                                            {v.available_quantity}
                                          </span>
                                        </TableCell>
                                        <TableCell className="py-2 text-xs text-center text-muted-foreground">
                                          {v.sold_quantity}
                                        </TableCell>
                                        <TableCell className="py-2 text-center">
                                          {stockBadge(v.available_quantity)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
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
        </CardContent>
      </Card>
    </div>
  );
}
