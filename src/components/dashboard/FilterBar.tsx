import { Calendar, Filter, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PeriodFilter, periodLabels } from "@/data/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
}: FilterBarProps) {
  const periods: PeriodFilter[] = ['today', 'week', 'month', 'quarter', 'year'];

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card rounded-xl p-4 shadow-md">
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        {/* Period Filter - Chips on desktop, Select on mobile */}
        <div className="hidden sm:flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1.5">
            {periods.map((period) => (
              <button
                key={period}
                onClick={() => onPeriodChange(period)}
                className={cn(
                  "filter-chip",
                  selectedPeriod === period && "filter-chip-active"
                )}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Period Select */}
        <div className="sm:hidden w-full">
          <Select value={selectedPeriod} onValueChange={(v) => onPeriodChange(v as PeriodFilter)}>
            <SelectTrigger className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Selecione o período" />
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

        {/* Marketplace Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <Select value={selectedMarketplace} onValueChange={onMarketplaceChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todos os marketplaces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Marketplaces</SelectItem>
              {marketplaceOptions.map((mp) => (
                <SelectItem key={mp.value} value={mp.value}>
                  <span className="flex items-center gap-2">
                    <span>{mp.logo}</span>
                    <span>{mp.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        {lastUpdate && (
          <span className="text-xs text-muted-foreground">
            Atualizado: {lastUpdate}
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
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </div>
    </div>
  );
}
