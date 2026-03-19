import { useState } from "react";
import { useMLInventory } from "@/contexts/MLInventoryContext";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package, PackageX, AlertTriangle, Boxes, RefreshCw, Search, ExternalLink, Plug,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MLEstoque() {
  const { items, summary, loading, hasToken, lastUpdated, refresh } = useMLInventory();
  const [search, setSearch] = useState("");

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toLowerCase().includes(search.toLowerCase())
  );

  const stockBadge = (qty: number) => {
    if (qty === 0) return <Badge variant="destructive" className="text-xs">Sem estoque</Badge>;
    if (qty <= 5) return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Baixo</Badge>;
    return <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">OK</Badge>;
  };

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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Anúncios</CardTitle>
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
              <p className="text-sm">{search ? "Nenhum produto encontrado" : "Nenhum produto ativo"}</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right w-28">Preço</TableHead>
                    <TableHead className="text-center w-28">Disponível</TableHead>
                    <TableHead className="text-center w-24">Vendidos</TableHead>
                    <TableHead className="text-center w-24">Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
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
                      <TableCell>
                        <p className="text-sm font-medium line-clamp-2 leading-tight">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.id}</p>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {currencyFmt(item.price)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-semibold ${item.available_quantity === 0 ? "text-destructive" : item.available_quantity <= 5 ? "text-amber-600" : "text-foreground"}`}>
                          {item.available_quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {item.sold_quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        {stockBadge(item.available_quantity)}
                      </TableCell>
                      <TableCell>
                        <a
                          href={`https://produto.mercadolivre.com.br/${item.id.replace(/^(MLB)(\d+)$/, '$1-$2')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
