import { useState, useMemo, useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "./ProgressBar";
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, Calendar, Pencil, Check, X } from "lucide-react";
import { DailySale } from "@/data/mockData";
import { ALL_MARKETPLACES } from "@/types/seller";
import { CalculatedDailySale } from "@/hooks/useSellerSalesData";
import { cn } from "@/lib/utils";

type SortField = "dia" | "vendaTotal" | "vendaAprovadaReal" | "gap" | "metaAtingida" | "yoyDia";

interface DailySalesTableProps {
  dailySalesData: CalculatedDailySale[];
  loading?: boolean;
  selectedMarketplace?: string;
  onMarketplaceChange?: (marketplace: string) => void;
  marketplaceOptions?: { value: string; label: string; logo: string }[];
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  availableMonths: number[];
  availableYears: number[];
  onUpdateSale?: (day: number, vendaTotal: number) => void;
  onUpdateSaleAprovadaReal?: (day: number, vendaAprovadaReal: number) => void;
  isEditable?: boolean;
  compact?: boolean;
}

interface MarketplaceBreakdown {
  id: string;
  name: string;
  logo: string;
  vendaTotal: number;
  metaVendas: number;
  gap: number;
  metaAtingida: number;
}

const meses = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

// Editable cell component
interface EditableCellProps {
  value: number;
  onSave: (newValue: number) => void;
  formatValue: (value: number) => string;
  isEditable: boolean;
}

function EditableCell({ value, onSave, formatValue, isEditable }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!isEditable) return;
    setEditValue(value.toString());
    setIsEditing(true);
  };

  const handleSave = () => {
    const numValue = parseFloat(editValue.replace(",", "."));
    if (!isNaN(numValue) && numValue >= 0) {
      onSave(numValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 w-24 text-right text-sm px-2"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-1 group",
        isEditable && "cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1"
      )}
      onClick={handleStartEdit}
    >
      <span className="font-medium">{formatValue(value)}</span>
      {isEditable && (
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

export function DailySalesTable({
  dailySalesData,
  loading,
  selectedMarketplace: externalMarketplace,
  onMarketplaceChange,
  marketplaceOptions: customMarketplaceOptions,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  availableMonths,
  availableYears,
  onUpdateSale,
  onUpdateSaleAprovadaReal,
  isEditable = true,
}: DailySalesTableProps) {
  const mpOptions = customMarketplaceOptions ?? [];
  const [sortBy, setSortBy] = useState<SortField>("dia");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  // Use external marketplace state
  const selectedMarketplace = externalMarketplace ?? "all";
  const setSelectedMarketplace = onMarketplaceChange ?? (() => {});

  // Get marketplace breakdown for a specific day (for aggregated view)
  // Note: This now returns empty data since we removed mock data
  const getMarketplaceBreakdown = (dia: number): MarketplaceBreakdown[] => {
    // Without mock data, return the active marketplaces with zero values
    // The actual data should come from the parent component
    return ALL_MARKETPLACES.map((mp) => ({
      id: mp.id,
      name: mp.name,
      logo: mp.logo,
      vendaTotal: 0,
      metaVendas: 0,
      gap: 0,
      metaAtingida: 0,
    }));
  };

  const handleRowClick = (dia: number) => {
    if (selectedMarketplace === "all") {
      setSelectedDay(dia);
      setIsBreakdownOpen(true);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    return [...dailySalesData].sort((a, b) => {
      const modifier = sortDirection === "asc" ? 1 : -1;
      switch (sortBy) {
        case "dia":
          return (a.dia - b.dia) * modifier;
        case "vendaTotal":
          return (a.vendaTotal - b.vendaTotal) * modifier;
        case "vendaAprovadaReal":
          return (a.vendaAprovadaReal - b.vendaAprovadaReal) * modifier;
        case "gap":
          return (a.gap - b.gap) * modifier;
        case "metaAtingida":
          return (a.metaAtingida - b.metaAtingida) * modifier;
        case "yoyDia":
          return (a.yoyDia - b.yoyDia) * modifier;
        default:
          return 0;
      }
    });
  }, [dailySalesData, sortBy, sortDirection]);

  // Totals calculation
  const totals = useMemo(() => {
    return dailySalesData.reduce(
      (acc, day) => ({
        metaVendas: acc.metaVendas + day.metaVendas,
        vendaTotal: acc.vendaTotal + day.vendaTotal,
        vendaAprovadaReal: acc.vendaAprovadaReal + day.vendaAprovadaReal,
        gap: acc.gap + day.gap,
        vendaAnoAnterior: acc.vendaAnoAnterior + day.vendaAnoAnterior,
      }),
      { metaVendas: 0, vendaTotal: 0, vendaAprovadaReal: 0, gap: 0, vendaAnoAnterior: 0 }
    );
  }, [dailySalesData]);

  const totalMetaAtingida = totals.metaVendas > 0 ? (totals.vendaTotal / totals.metaVendas) * 100 : 0;
  const totalYoy = totals.vendaAnoAnterior > 0 ? ((totals.vendaTotal - totals.vendaAnoAnterior) / totals.vendaAnoAnterior) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "" : ""}${value.toFixed(1)}%`;
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown
      className={`w-3 h-3 ml-1 inline-block transition-colors ${
        sortBy === field ? "text-primary" : "text-muted-foreground"
      }`}
    />
  );

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value > 0) {
      return (
        <span className="inline-flex items-center text-success font-medium">
          <TrendingUp className="w-3 h-3 mr-1" />
          +{value.toFixed(1)}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="inline-flex items-center text-destructive font-medium">
          <TrendingDown className="w-3 h-3 mr-1" />
          {value.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-muted-foreground">
        <Minus className="w-3 h-3 mr-1" />
        0%
      </span>
    );
  };

  const GapIndicator = ({ value }: { value: number }) => {
    const colorClass = value >= 0 ? "text-success" : "text-destructive";
    return (
      <span className={`font-medium ${colorClass}`}>
        {value >= 0 ? "+" : ""}{formatCurrency(value)}
      </span>
    );
  };

  const selectedMarketplaceLabel = mpOptions.find((mp) => mp.value === selectedMarketplace);

  const handleSaleUpdate = (day: number, vendaTotal: number) => {
    if (onUpdateSale) {
      onUpdateSale(day, vendaTotal);
    }
  };

  const handleAprovadaRealUpdate = (day: number, vendaAprovadaReal: number) => {
    if (onUpdateSaleAprovadaReal) {
      onUpdateSaleAprovadaReal(day, vendaAprovadaReal);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded animate-pulse w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-semibold">Vendas Diárias</CardTitle>
          {isEditable && selectedMarketplace !== "all" && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Clique para editar
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort("dia")}
                >
                  Dia
                  <SortIcon field="dia" />
                </TableHead>
                <TableHead className="whitespace-nowrap">Semana</TableHead>
                <TableHead className="text-right whitespace-nowrap">PMT</TableHead>
                <TableHead className="text-right whitespace-nowrap">PMT Acum</TableHead>
                <TableHead className="text-right whitespace-nowrap">Meta Vendas</TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right whitespace-nowrap"
                  onClick={() => handleSort("vendaTotal")}
                >
                  Venda Bruta Aprov.
                  <SortIcon field="vendaTotal" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right whitespace-nowrap"
                  onClick={() => handleSort("vendaAprovadaReal")}
                >
                  Venda Aprov. Real
                  <SortIcon field="vendaAprovadaReal" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right whitespace-nowrap"
                  onClick={() => handleSort("gap")}
                >
                  GAP
                  <SortIcon field="gap" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-center whitespace-nowrap min-w-[140px]"
                  onClick={() => handleSort("metaAtingida")}
                >
                  % Meta
                  <SortIcon field="metaAtingida" />
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">Venda Ano Ant.</TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right whitespace-nowrap"
                  onClick={() => handleSort("yoyDia")}
                >
                  YoY
                  <SortIcon field="yoyDia" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((day, index) => (
                <TableRow
                  key={day.dia}
                  className={cn(
                    index % 2 === 0 ? "bg-muted/30" : "",
                    selectedMarketplace === "all" && "cursor-pointer hover:bg-primary/5 transition-colors",
                  )}
                  onClick={() => selectedMarketplace === "all" && handleRowClick(day.dia)}
                >
                  <TableCell className="font-medium">
                    {day.dia}
                  </TableCell>
                  <TableCell className="capitalize">{day.semana}</TableCell>
                  <TableCell className="text-right">{formatPercent(day.pmt)}</TableCell>
                  <TableCell className="text-right">{formatPercent(day.pmtAcum)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(day.metaVendas)}</TableCell>
                  <TableCell className="text-right">
                    {selectedMarketplace !== "all" && isEditable ? (
                      <EditableCell
                        value={day.vendaTotal}
                        onSave={(newValue) => handleSaleUpdate(day.dia, newValue)}
                        formatValue={formatCurrency}
                        isEditable={true}
                      />
                    ) : (
                      <span className="font-medium">
                        {formatCurrency(day.vendaTotal)}
                        {selectedMarketplace === "all" && (
                          <span className="ml-2 text-xs text-primary">🔍</span>
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {selectedMarketplace !== "all" && isEditable ? (
                      <EditableCell
                        value={day.vendaAprovadaReal}
                        onSave={(newValue) => handleAprovadaRealUpdate(day.dia, newValue)}
                        formatValue={formatCurrency}
                        isEditable={true}
                      />
                    ) : (
                      <span className="font-medium">
                        {formatCurrency(day.vendaAprovadaReal)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <GapIndicator value={day.gap} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={day.metaAtingida} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {formatPercent(day.metaAtingida)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(day.vendaAnoAnterior)}
                  </TableCell>
                  <TableCell className="text-right">
                    <GrowthIndicator value={day.yoyDia} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <TableRow className="bg-muted/50 font-semibold border-t-2">
                <TableCell colSpan={4}>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.metaVendas)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.vendaTotal)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.vendaAprovadaReal)}</TableCell>
                <TableCell className="text-right">
                  <GapIndicator value={totals.gap} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={totalMetaAtingida} className="flex-1" />
                    <span className="text-xs w-12 text-right">
                      {formatPercent(totalMetaAtingida)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(totals.vendaAnoAnterior)}
                </TableCell>
                <TableCell className="text-right">
                  <GrowthIndicator value={totalYoy} />
                </TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </div>
      </CardContent>

      {/* Marketplace Breakdown Dialog */}
      <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Detalhamento do Dia {selectedDay}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marketplace</TableHead>
                  <TableHead className="text-right">Venda Bruta Aprov.</TableHead>
                  <TableHead className="text-right">Venda Aprov. Real</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-right">GAP</TableHead>
                  <TableHead className="text-center min-w-[120px]">% Meta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDay &&
                  getMarketplaceBreakdown(selectedDay).map((mp, index) => (
                    <TableRow key={mp.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <span>{mp.logo}</span>
                          <span>{mp.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(mp.vendaTotal)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(mp.metaVendas)}</TableCell>
                      <TableCell className="text-right">
                        <GapIndicator value={mp.gap} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={mp.metaAtingida} className="flex-1" />
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {formatPercent(mp.metaAtingida)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
              <tfoot>
                <TableRow className="bg-muted/50 font-semibold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">
                    {selectedDay &&
                      formatCurrency(
                        getMarketplaceBreakdown(selectedDay).reduce((sum, mp) => sum + mp.vendaTotal, 0)
                      )}
                  </TableCell>
                  <TableCell className="text-right">
                    {selectedDay &&
                      formatCurrency(
                        getMarketplaceBreakdown(selectedDay).reduce((sum, mp) => sum + mp.metaVendas, 0)
                      )}
                  </TableCell>
                  <TableCell className="text-right">
                    {selectedDay && (
                      <GapIndicator
                        value={getMarketplaceBreakdown(selectedDay).reduce((sum, mp) => sum + mp.gap, 0)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {selectedDay &&
                      (() => {
                        const breakdown = getMarketplaceBreakdown(selectedDay);
                        const totalVenda = breakdown.reduce((sum, mp) => sum + mp.vendaTotal, 0);
                        const totalMeta = breakdown.reduce((sum, mp) => sum + mp.metaVendas, 0);
                        const percentage = totalMeta > 0 ? (totalVenda / totalMeta) * 100 : 0;
                        return (
                          <div className="flex items-center gap-2">
                            <ProgressBar value={percentage} className="flex-1" />
                            <span className="text-xs w-12 text-right">{formatPercent(percentage)}</span>
                          </div>
                        );
                      })()}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
