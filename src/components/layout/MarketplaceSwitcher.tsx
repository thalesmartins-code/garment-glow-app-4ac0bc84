import { Check, ChevronDown, Layers, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { Badge } from "@/components/ui/badge";

export function MarketplaceSwitcher() {
  const { marketplaces, selectedMarketplace, setSelectedMarketplace, connectedMarketplaces } =
    useMarketplace();

  const selected =
    selectedMarketplace === "all"
      ? null
      : marketplaces.find((m) => m.id === selectedMarketplace);

  const label = selected ? selected.name : "Todos os marketplaces";
  const Icon = selected?.icon ?? Layers;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2.5 rounded-xl border-0 bg-secondary/50 px-3 hover:bg-secondary"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
          <span className="hidden text-sm font-medium text-foreground sm:inline">{label}</span>
          <ChevronDown className="ml-0.5 h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <Store className="h-3.5 w-3.5" />
          Marketplace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* "All" option */}
        <DropdownMenuItem
          onClick={() => setSelectedMarketplace("all")}
          className={`cursor-pointer gap-2.5 rounded-lg px-2 py-2 ${
            selectedMarketplace === "all" ? "bg-accent/10" : ""
          }`}
        >
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
              selectedMarketplace === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
          </div>
          <span
            className={`flex-1 text-sm ${
              selectedMarketplace === "all" ? "font-semibold" : "font-medium"
            }`}
          >
            Todos
          </span>
          {selectedMarketplace === "all" && (
            <Check className="h-4 w-4 shrink-0 text-accent" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Individual marketplaces */}
        {marketplaces.map((mp) => {
          const isActive = selectedMarketplace === mp.id;
          const MpIcon = mp.icon;

          return (
            <DropdownMenuItem
              key={mp.id}
              onClick={() => mp.connected && setSelectedMarketplace(mp.id)}
              disabled={!mp.connected}
              className={`cursor-pointer gap-2.5 rounded-lg px-2 py-2 ${
                isActive ? "bg-accent/10" : ""
              } ${!mp.connected ? "opacity-50" : ""}`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${mp.color} text-white`}
              >
                <MpIcon className="h-4 w-4" />
              </div>
              <span
                className={`flex-1 text-sm ${isActive ? "font-semibold" : "font-medium"}`}
              >
                {mp.name}
              </span>
              {!mp.connected && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Em breve
                </Badge>
              )}
              {isActive && <Check className="h-4 w-4 shrink-0 text-accent" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
