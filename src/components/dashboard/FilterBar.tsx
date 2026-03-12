import { Calendar as CalendarIcon, Filter, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PeriodFilter, periodLabels } from "@/data/mockData";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Default empty marketplace options
const defaultMarketplaceOptions: { value: string; label: string; logo: string }[] = [];

interface FilterBarProps {
  selectedPeriod: PeriodFilter;
  selectedMarketplace: string | "all";
  onPeriodChange: (period: PeriodFilter) => void;
  onMarketplaceChange: (marketplace: string | "all") => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  lastUpdate?: string;
  marketplaceOptions?: { value: string; label: string; logo: string }[];
  customDateRange?: { from: Date; to: Date };
  onCustomDateRangeChange?: (range: { from: Date; to: Date }) => void;
}

export function FilterBar({
  selectedPeriod,
  selectedMarketplace,
  onPeriodChange,
  onMarketplaceChange,
  onRefresh,
  isRefreshing = false,
  lastUpdate,
  marketplaceOptions = defaultMarketplaceOptions,
  customDateRange,
  onCustomDateRangeChange,
}: FilterBarProps) {
  const periods: PeriodFilter[] = ['today', 'week', 'month', 'quarter', 'year', 'custom'];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card rounded-xl p-4 shadow-md">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Marketplace Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedMarketplace} onValueChange={onMarketplaceChange}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
              <SelectValue>
                {selectedMarketplace === "all" ? (
                  <span className="flex items-center gap-1.5">
                    <span>📊</span>
                    <span>Todos</span>
                  </span>
                ) : (
                  (() => {
                    const mp = marketplaceOptions.find(m => m.value === selectedMarketplace);
                    return mp ? (
                      <span className="flex items-center gap-1.5">
                        <span>{mp.logo}</span>
                        <span>{mp.label}</span>
                      </span>
                    ) : selectedMarketplace;
                  })()
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-1.5">
                  <span>📊</span>
                  <span>Todos</span>
                </span>
              </SelectItem>
              {marketplaceOptions.map((mp) => (
                <SelectItem key={mp.value} value={mp.value}>
                  <span className="flex items-center gap-1.5">
                    <span>{mp.logo}</span>
                    <span>{mp.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Period Filter - Single Select */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedPeriod} onValueChange={(v) => onPeriodChange(v as PeriodFilter)}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
              <CalendarIcon className="w-4 h-4 mr-1.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period} value={period}>
                  {periodLabels[period]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range Pickers */}
        {selectedPeriod === "custom" && onCustomDateRangeChange && customDateRange && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-sm">
                  <CalendarIcon className="h-4 w-4" />
                  {format(customDateRange.from, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDateRange.from}
                  onSelect={(date) => date && onCustomDateRangeChange({ ...customDateRange, from: date })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-sm text-muted-foreground">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-sm">
                  <CalendarIcon className="h-4 w-4" />
                  {format(customDateRange.to, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDateRange.to}
                  onSelect={(date) => date && onCustomDateRangeChange({ ...customDateRange, to: date })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Refresh */}
      <div className="flex items-center gap-3 shrink-0">
        {lastUpdate ? (
          <span className="text-xs text-muted-foreground hidden lg:inline">
            Última sinc: {lastUpdate}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground hidden lg:inline">
            Nunca sincronizado
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          <span className="hidden sm:inline">Sincronizar</span>
        </Button>
      </div>
    </div>
  );
}
