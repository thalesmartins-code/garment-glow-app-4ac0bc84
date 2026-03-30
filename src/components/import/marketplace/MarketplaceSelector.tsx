import { cn } from "@/lib/utils";
import type { MarketplaceType } from "@/utils/marketplaceParsers";

interface Props {
  marketplaces: { id: MarketplaceType; label: string; icon: React.ElementType; color: string }[];
  selected: MarketplaceType | null;
  onSelect: (id: MarketplaceType) => void;
}

export function MarketplaceSelector({ marketplaces, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {marketplaces.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={cn(
            "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
            selected === m.id
              ? `${m.color} border-current shadow-sm`
              : "border-muted hover:border-muted-foreground/30 bg-card"
          )}
        >
          <m.icon className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-medium">{m.label}</p>
            <p className="text-xs text-muted-foreground">Relatório de vendas</p>
          </div>
        </button>
      ))}
    </div>
  );
}
