import { useMemo } from "react";
import { Check, ChevronDown, Layers, Store as StoreIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useMarketplace, type MarketplaceDefinition } from "@/contexts/MarketplaceContext";
import { useSeller } from "@/contexts/SellerContext";
import { ALL_MARKETPLACES } from "@/types/seller";

const SELLER_TO_MP_ID: Record<string, string> = {
  ml: "mercado-livre",
  amz: "amazon",
  shopee: "shopee",
  magalu: "magalu",
  netshoes: "netshoes",
  dafiti: "dafiti",
};

export function MarketplaceSwitcher() {
  const { marketplaces } = useMarketplace();
  const {
    selectedSeller,
    selectedStoreIds,
    setSelectedStoreIds,
    toggleStoreId,
  } = useSeller();

  const sellerStores = selectedSeller?.stores.filter((s) => s.is_active) ?? [];
  const allSelected = selectedStoreIds.length === 0;

  const getMpDef = (storeMarketplace: string): MarketplaceDefinition | undefined => {
    const mpId = SELLER_TO_MP_ID[storeMarketplace] ?? storeMarketplace;
    return marketplaces.find((m) => m.id === mpId);
  };

  // Group stores by marketplace
  const storeGroups = useMemo(() => {
    const map = new Map<string, typeof sellerStores>();
    for (const store of sellerStores) {
      if (!map.has(store.marketplace)) map.set(store.marketplace, []);
      map.get(store.marketplace)!.push(store);
    }
    return Array.from(map.entries()).map(([mpKey, stores]) => ({
      mpKey,
      mpDef: getMpDef(mpKey),
      stores,
    }));
  }, [sellerStores, marketplaces]);

  // Build trigger label + icon
  const firstSelected = !allSelected
    ? sellerStores.find((s) => s.id === selectedStoreIds[0])
    : null;
  const firstMpDef = firstSelected ? getMpDef(firstSelected.marketplace) : null;

  const label = allSelected
    ? "Todas"
    : selectedStoreIds.length === 1
      ? firstSelected?.store_name ?? "1 loja"
      : `${selectedStoreIds.length} lojas`;

  const Icon = firstMpDef?.icon;
  const gradientClass = firstMpDef?.color ?? "";

  const handleToggleAll = () => setSelectedStoreIds([]);

  const handleToggleStore = (storeId: string) => {
    if (allSelected) {
      setSelectedStoreIds([storeId]);
    } else {
      if (selectedStoreIds.length === 1 && selectedStoreIds[0] === storeId) {
        setSelectedStoreIds([]);
      } else {
        toggleStoreId(storeId);
      }
    }
  };

  const allDotsExpanded = (
    <div className="flex items-center -space-x-1">
      {sellerStores.slice(0, 3).map((store) => {
        const mpDef = getMpDef(store.marketplace);
        if (!mpDef) return null;
        const MpIcon = mpDef.icon;
        return (
          <div
            key={store.id}
            className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${mpDef.color} ring-1 ring-background`}
          >
            <MpIcon className="h-2.5 w-2.5 text-white" />
          </div>
        );
      })}
      {sellerStores.length > 3 && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted ring-1 ring-background">
          <span className="text-[8px] font-semibold text-muted-foreground">+{sellerStores.length - 3}</span>
        </div>
      )}
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto gap-2 rounded-lg border border-border/40 px-2.5 py-1.5 hover:bg-muted/50"
        >
          <AnimatePresence mode="wait">
            {(!allSelected && firstMpDef) ? (
              <motion.div
                key={selectedStoreIds.join("-")}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="relative shrink-0"
              >
                <div className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${gradientClass}`}>
                  {Icon && <Icon className="h-3 w-3 text-white" />}
                </div>
                {selectedStoreIds.length > 1 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground ring-1 ring-background">
                    {selectedStoreIds.length}
                  </span>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="all"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {sellerStores.length > 0 ? allDotsExpanded : (
                  <Layers className="h-4 w-4 text-muted-foreground" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="hidden text-left sm:block overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={label}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-xs font-medium text-foreground truncate max-w-[100px] block"
              >
                {label}
              </motion.span>
            </AnimatePresence>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52 rounded-lg p-1">
        {/* "All" option */}
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); handleToggleAll(); }}
          className={`cursor-pointer gap-2 rounded-md px-2 py-1.5 focus:bg-muted/50 ${allSelected ? "bg-muted/60" : ""}`}
        >
          <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className={`flex-1 text-sm ${allSelected ? "font-medium" : ""}`}>
            Todas as lojas
          </span>
          {allSelected && <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        {/* Stores grouped by marketplace */}
        {storeGroups.map(({ mpKey, mpDef, stores }, groupIdx) => {
          const MpIcon = mpDef?.icon ?? StoreIcon;
          const color = mpDef?.color ?? "from-gray-500 to-gray-600";
          const mpName = mpDef?.name ?? mpKey;

          // Single store: flat item
          if (stores.length === 1) {
            const store = stores[0];
            const isChecked = !allSelected && selectedStoreIds.includes(store.id);
            return (
              <div key={mpKey}>
                {groupIdx > 0 && <DropdownMenuSeparator className="my-1" />}
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); handleToggleStore(store.id); }}
                  className={`cursor-pointer gap-2 rounded-md px-2 py-1.5 focus:bg-muted/50 ${isChecked ? "bg-muted/60" : ""}`}
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded bg-gradient-to-br ${color}`}
                  >
                    <MpIcon className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className={`flex-1 text-sm truncate ${isChecked ? "font-medium" : ""}`}>
                    {store.store_name}
                  </span>
                  {isChecked && <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />}
                </DropdownMenuItem>
              </div>
            );
          }

          // Multiple stores: grouped
          return (
            <div key={mpKey}>
              {groupIdx > 0 && <DropdownMenuSeparator className="my-1" />}
              <div className="flex items-center gap-1.5 px-2 py-1">
                <div
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-gradient-to-br ${color}`}
                >
                  <MpIcon className="h-2 w-2 text-white" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {mpName}
                </span>
              </div>
              {stores.map((store) => {
                const isChecked = !allSelected && selectedStoreIds.includes(store.id);
                return (
                  <DropdownMenuItem
                    key={store.id}
                    onSelect={(e) => { e.preventDefault(); handleToggleStore(store.id); }}
                    className={`cursor-pointer gap-2 rounded-md px-2 py-1.5 pl-7 focus:bg-muted/50 ${isChecked ? "bg-muted/60" : ""}`}
                  >
                    <span className={`flex-1 text-sm truncate ${isChecked ? "font-medium" : ""}`}>
                      {store.store_name}
                    </span>
                    {isChecked && <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />}
                  </DropdownMenuItem>
                );
              })}
            </div>
          );
        })}

        {sellerStores.length === 0 && (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            Nenhuma loja cadastrada
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
