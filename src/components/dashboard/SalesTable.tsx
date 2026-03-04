import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketplaceSales } from "@/data/mockData";
import { ProgressBar } from "./ProgressBar";
import { EditableQuantityCell } from "./EditableQuantityCell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SortField = "marketplace" | "vendas" | "vendaTotal" | "vendaAprovadaReal" | "pmt" | "meta" | "metaPercentage" | "yoyGrowth";
type SortDirection = "asc" | "desc";

interface SalesTableProps {
  data: MarketplaceSales[];
  loading?: boolean;
  onUpdateQuantity?: (marketplaceId: string, qtdVendas: number) => void;
  isEditable?: boolean;
}
export function SalesTable({
  data,
  loading = false,
  onUpdateQuantity,
  isEditable = false
}: SalesTableProps) {
  const [sortBy, setSortBy] = useState<SortField>("vendaTotal");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("desc");
    }
  };
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortBy, sortDirection]);
  const totals = useMemo(() => {
    return {
      vendas: data.reduce((sum, mp) => sum + mp.vendas, 0),
      vendaTotal: data.reduce((sum, mp) => sum + mp.vendaTotal, 0),
      vendaAprovadaReal: data.reduce((sum, mp) => sum + (mp.vendaAprovadaReal ?? 0), 0),
      meta: data.reduce((sum, mp) => sum + mp.meta, 0),
      lastYearTotal: data.reduce((sum, mp) => sum + mp.lastYearTotal, 0)
    };
  }, [data]);
  
  const totalMetaPercentage = totals.meta > 0 ? (totals.vendaTotal / totals.meta) * 100 : 0;
  const totalYoyGrowth = totals.lastYearTotal > 0 ? ((totals.vendaTotal - totals.lastYearTotal) / totals.lastYearTotal) * 100 : 0;
  const totalPmt = totals.vendas > 0 ? totals.vendaTotal / totals.vendas : 0;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };
  const SortIcon = ({
    field
  }: {
    field: SortField;
  }) => {
    if (sortBy !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />;
  };
  if (loading) {
    return <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted rounded" />)}
        </CardContent>
      </Card>;
  }
  return <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Vendas por Marketplace</CardTitle>
        <span className="text-sm text-muted-foreground">
          {data.length} marketplace{data.length !== 1 && "s"}
        </span>
      </CardHeader>
      <CardContent>

      <div className="overflow-x-auto">
        <Table className="data-table">
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort("marketplace")} className="min-w-[160px]">
                <span className="flex items-center gap-2">
                  Marketplace
                  <SortIcon field="marketplace" />
                </span>
              </TableHead>
              <TableHead onClick={() => handleSort("vendas")} className="text-right">
                <span className="flex items-center justify-end gap-2">
                  Qtd. Vendas
                  <SortIcon field="vendas" />
                </span>
              </TableHead>
              <TableHead onClick={() => handleSort("vendaTotal")} className="text-right min-w-[140px]">
                <span className="flex items-center justify-end gap-2">
                  Venda Bruta Aprovada
                  <SortIcon field="vendaTotal" />
                </span>
              </TableHead>
              <TableHead onClick={() => handleSort("vendaAprovadaReal")} className="text-right min-w-[140px]">
                <span className="flex items-center justify-end gap-2">
                  Venda Aprovada Real
                  <SortIcon field="vendaAprovadaReal" />
                </span>
              </TableHead>
              <TableHead onClick={() => handleSort("pmt")} className="text-right">
                <span className="flex items-center justify-end gap-2">
                  Ticket Médio 
                  <SortIcon field="pmt" />
                </span>
              </TableHead>
              <TableHead onClick={() => handleSort("meta")} className="text-right min-w-[120px]">
                <span className="flex items-center justify-end gap-2">
                  Meta
                  <SortIcon field="meta" />
                </span>
              </TableHead>
              <TableHead onClick={() => handleSort("metaPercentage")} className="min-w-[150px]">
                <span className="flex items-center gap-2">
                  % da Meta
                  <SortIcon field="metaPercentage" />
                </span>
              </TableHead>
              <TableHead onClick={() => handleSort("yoyGrowth")} className="text-right min-w-[120px]">
                <span className="flex items-center justify-end gap-2">
                  YoY
                  <SortIcon field="yoyGrowth" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map(mp => {
              const ticketMedio = mp.vendas > 0 ? mp.vendaTotal / mp.vendas : 0;
              
              return (
                <TableRow key={mp.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{mp.logo}</span>
                      <span>{mp.marketplace}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditable && onUpdateQuantity ? (
                      <EditableQuantityCell
                        value={mp.vendas}
                        onSave={(newValue) => onUpdateQuantity(mp.id, newValue)}
                        isEditable={isEditable}
                      />
                    ) : (
                      <span className="font-medium">{formatNumber(mp.vendas)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(mp.vendaTotal)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(mp.vendaAprovadaReal ?? 0)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(ticketMedio)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(mp.meta)}
                  </TableCell>
                  <TableCell>
                    <ProgressBar value={mp.metaPercentage} showLabel size="sm" />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn("inline-flex items-center gap-1 font-semibold", mp.yoyGrowth > 0 ? "text-kpi-positive" : mp.yoyGrowth < 0 ? "text-kpi-negative" : "text-muted-foreground")}>
                      {mp.yoyGrowth > 0 ? <TrendingUp className="w-4 h-4" /> : mp.yoyGrowth < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                      {mp.yoyGrowth > 0 ? "+" : ""}
                      {mp.yoyGrowth.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>

          {/* Footer with totals */}
          <tfoot className="bg-muted/50 border-t-2 border-border">
            <tr className="font-semibold">
              <td className="px-4 py-4">
                <span className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <span>Total Geral</span>
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                {formatNumber(totals.vendas)}
              </td>
              <td className="px-4 py-4 text-right text-primary">
                {formatCurrency(totals.vendaTotal)}
              </td>
              <td className="px-4 py-4 text-right text-primary">
                {formatCurrency(totals.vendaAprovadaReal)}
              </td>
              <td className="px-4 py-4 text-right text-muted-foreground">
                {formatCurrency(totalPmt)}
              </td>
              <td className="px-4 py-4 text-right text-muted-foreground">
                {formatCurrency(totals.meta)}
              </td>
              <td className="px-4 py-4">
                <ProgressBar value={totalMetaPercentage} showLabel size="sm" />
              </td>
              <td className="px-4 py-4 text-right">
                <span className={cn("inline-flex items-center gap-1", totalYoyGrowth > 0 ? "text-kpi-positive" : totalYoyGrowth < 0 ? "text-kpi-negative" : "text-muted-foreground")}>
                  {totalYoyGrowth > 0 ? <TrendingUp className="w-4 h-4" /> : totalYoyGrowth < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                  {totalYoyGrowth > 0 ? "+" : ""}
                  {totalYoyGrowth.toFixed(1)}%
                </span>
              </td>
            </tr>
          </tfoot>
        </Table>
      </div>
      </CardContent>
    </Card>;
}