import { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, ShoppingCart, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface StoreKPI {
  name: string;
  revenue: number;
  orders: number;
  avgTicket: number;
  sparkline?: number[];
}

export interface MarketplaceGroup {
  id: string;
  name: string;
  icon: LucideIcon;
  gradient: string;
  revenue: number;
  stores: StoreKPI[];
}

interface Props {
  groups: MarketplaceGroup[];
}

export function MarketplaceAccordion({ groups }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (groups.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Detalhamento por Marketplace</h3>
      {groups.map((g) => {
        const isOpen = openIds.has(g.id);
        const Icon = g.icon;
        return (
          <Collapsible key={g.id} open={isOpen} onOpenChange={() => toggle(g.id)}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-colors",
                  "hover:bg-muted/50",
                  isOpen && "bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg w-8 h-8 flex items-center justify-center shrink-0 bg-gradient-to-br text-white",
                    g.gradient
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-medium text-sm flex-1">{g.name}</span>
                <span className="text-sm font-semibold tabular-nums">{currencyFmt(g.revenue)}</span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-90"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 pt-2 pl-11">
                {g.stores.map((store) => (
                  <Card key={store.name} className="border-border/50">
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground truncate flex-1">{store.name}</p>
                        {store.sparkline && store.sparkline.length > 1 && (
                          <Sparkline data={store.sparkline} className="shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground tabular-nums">
                          {currencyFmt(store.revenue)}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <ShoppingCart className="h-3 w-3" />
                          {store.orders}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Tag className="h-3 w-3" />
                          {currencyFmt(store.avgTicket)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
