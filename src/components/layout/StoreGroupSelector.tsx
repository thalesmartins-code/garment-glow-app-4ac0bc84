import { useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useSeller } from "@/contexts/SellerContext";
import { ALL_MARKETPLACES } from "@/types/seller";
import { getMarketplaceBrand } from "@/config/marketplaceConfig";
import { cn } from "@/lib/utils";

const MP_MAP = Object.fromEntries(ALL_MARKETPLACES.map((m) => [m.id, m]));

interface Props {
  className?: string;
}

export function StoreGroupSelector({ className }: Props) {
  const { selectedSeller, selectedStoreIds, setSelectedStoreIds, toggleStoreId } = useSeller();

  const activeStores = useMemo(
    () => (selectedSeller?.stores ?? []).filter((s) => s.is_active),
    [selectedSeller]
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof activeStores>();
    for (const store of activeStores) {
      if (!map.has(store.marketplace)) map.set(store.marketplace, []);
      map.get(store.marketplace)!.push(store);
    }
    return Array.from(map.entries()).map(([mpId, stores]) => ({
      mpId,
      mp: MP_MAP[mpId] ?? { id: mpId, name: mpId, logo: "🏪" },
      stores,
    }));
  }, [activeStores]);

  const allSelected = selectedStoreIds.length === 0;

  if (activeStores.length === 0) return null;

  const chipBase =
    "h-7 px-2.5 text-xs rounded-lg border font-medium transition-colors cursor-pointer select-none inline-flex items-center gap-1.5 whitespace-nowrap";
  const chipActive = "bg-primary/10 text-primary border-primary/30";
  const chipInactive = "border-border/50 text-muted-foreground hover:bg-muted/50";

  const handleStoreClick = (storeId: string) => {
    if (allSelected) {
      setSelectedStoreIds([storeId]);
    } else if (selectedStoreIds.includes(storeId)) {
      const next = selectedStoreIds.filter((id) => id !== storeId);
      setSelectedStoreIds(next.length === 0 ? [] : next);
    } else {
      setSelectedStoreIds([...selectedStoreIds, storeId]);
    }
  };

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {/* "Todas" chip */}
      <button
        onClick={() => setSelectedStoreIds([])}
        className={cn(chipBase, allSelected ? chipActive : chipInactive)}
      >
        {allSelected && <Check className="h-3 w-3" />}
        Todas
      </button>

      {groups.map(({ mpId, mp, stores }) => {
        if (stores.length === 1) {
          const store = stores[0];
          const isActive = !allSelected && selectedStoreIds.includes(store.id);
          const brand = getMarketplaceBrand(store.marketplace);
          const BrandIcon = brand?.icon;
          return (
            <button
              key={store.id}
              onClick={() => handleStoreClick(store.id)}
              className={cn(chipBase, isActive ? chipActive : chipInactive)}
            >
              {BrandIcon ? (
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded bg-gradient-to-br ${brand.gradient}`}>
                  <BrandIcon className="h-2.5 w-2.5 text-white" />
                </div>
              ) : (
                <span>{mp.name.charAt(0)}</span>
              )}
              <span>{store.store_name}</span>
            </button>
          );
        }

        // Multiple stores in marketplace — dropdown
        const mpStoreIds = stores.map((s) => s.id);
        const selectedInGroup = mpStoreIds.filter((id) => selectedStoreIds.includes(id));
        const hasSelection = !allSelected && selectedInGroup.length > 0;

        const groupBrand = getMarketplaceBrand(mpId);
        const GroupIcon = groupBrand?.icon;

        return (
          <DropdownMenu key={mpId}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(chipBase, hasSelection ? chipActive : chipInactive)}
              >
                {GroupIcon ? (
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded bg-gradient-to-br ${groupBrand.gradient}`}>
                    <GroupIcon className="h-2.5 w-2.5 text-white" />
                  </div>
                ) : (
                  <span>{mp.name.charAt(0)}</span>
                )}
                <span>{mp.name}</span>
                {hasSelection && (
                  <span className="text-[10px] opacity-70">
                    ({selectedInGroup.length}/{stores.length})
                  </span>
                )}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px] p-1.5">
              {stores.map((store) => {
                const isChecked = !allSelected && selectedStoreIds.includes(store.id);
                return (
                  <button
                    key={store.id}
                    onClick={() => handleStoreClick(store.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                      isChecked
                        ? "bg-primary/8 text-primary font-medium"
                        : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      className="h-3.5 w-3.5 pointer-events-none"
                      tabIndex={-1}
                    />
                    <span className="flex-1 truncate text-left">{store.store_name}</span>
                  </button>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
}
