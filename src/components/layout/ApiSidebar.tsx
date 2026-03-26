import { ArrowLeft, ClipboardList, Megaphone, Package, Plug, ShoppingBag, TrendingUp } from "lucide-react";
import { EnvironmentSidebar } from "./EnvironmentSidebar";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const apiItems = [
  { icon: TrendingUp, label: "Vendas", path: "/api" },
  { icon: Package, label: "Estoque", path: "/api/estoque" },
  { icon: ShoppingBag, label: "Anúncios", path: "/api/produtos" },
  { icon: ClipboardList, label: "Pedidos", path: "/api/pedidos" },
  { icon: Megaphone, label: "Publicidade", path: "/api/anuncios" },
  { icon: Plug, label: "Integrações", path: "/api/integracoes" },
];

const backToMainItem = {
  icon: ArrowLeft,
  label: "Voltar ao painel",
  path: "/",
};

function MarketplaceIndicator({ collapsed }: { collapsed: boolean }) {
  const { activeMarketplace, selectedMarketplace, connectedMarketplaces, marketplaces } = useMarketplace();

  const isAll = selectedMarketplace === "all";
  const name = isAll ? "Todos" : activeMarketplace?.name ?? "Todos";
  const Icon = activeMarketplace?.icon;
  const gradientClass = activeMarketplace?.color ?? "from-primary to-primary";

  // "All" collapsed: show stacked dots for each marketplace
  const allDots = (
    <div className="flex items-center gap-0.5">
      {marketplaces.map((mp) => (
        <div
          key={mp.id}
          className={cn("h-2 w-2 rounded-full bg-gradient-to-br", mp.color)}
        />
      ))}
    </div>
  );

  // "All" expanded: show colored dots inline
  const allDotsExpanded = (
    <div className="flex items-center gap-1">
      {marketplaces.map((mp) => {
        const MpIcon = mp.icon;
        return (
          <div
            key={mp.id}
            className={cn("flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br", mp.color)}
          >
            <MpIcon className="h-2.5 w-2.5 text-white" />
          </div>
        );
      })}
    </div>
  );

  const indicator = (
    <div
      className={cn(
        "mx-3 flex items-center gap-2.5 rounded-xl border border-sidebar-border/50 bg-sidebar-accent/40 px-3 py-2 transition-all duration-300",
        collapsed && "mx-2 justify-center px-0 py-2 w-12"
      )}
    >
      {/* Icon area */}
      {isAll ? (
        collapsed ? allDots : (
          <div className="flex-shrink-0">{allDotsExpanded}</div>
        )
      ) : (
        <div
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm transition-transform duration-300",
            gradientClass
          )}
        >
          {Icon && <Icon className="h-3.5 w-3.5 text-white" />}
        </div>
      )}

      {/* Text */}
      <div
        className={cn(
          "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}
      >
        <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-medium">
          Marketplace
        </p>
        <p className="text-xs font-semibold text-sidebar-foreground leading-tight">
          {name}
        </p>
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return indicator;
}

export function ApiSidebar() {
  return (
    <EnvironmentSidebar
      items={apiItems}
      footerItem={backToMainItem}
      headerSlot={(collapsed) => <MarketplaceIndicator collapsed={collapsed} />}
    />
  );
}
