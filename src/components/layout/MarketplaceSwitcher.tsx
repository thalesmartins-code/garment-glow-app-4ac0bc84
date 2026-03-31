import { Check, ChevronDown, Layers, Store } from "lucide-react";
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

// Map seller store marketplace ids to MarketplaceContext definitions
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

  // Find marketplace definition for a seller store
  const getMpDef = (storeMarketplace: string): MarketplaceDefinition | undefined => {
    const mpId = SELLER_TO_MP_ID[storeMarketplace] ?? storeMarketplace;
    return marketplaces.find((m) => m.id === mpId);
  };

  const getStoreLogo = (storeMarketplace: string): string =>
    ALL_MARKETPLACES.find((m) => m.id === storeMarketplace)?.logo ?? "🏪";

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
      // Start specific selection with just this store
      setSelectedStoreIds([storeId]);
    } else {
      if (selectedStoreIds.length === 1 && selectedStoreIds[0] === storeId) {
        // Deselecting last → revert to "all"
        setSelectedStoreIds([]);
      } else {
        toggleStoreId(storeId);
      }
    }
  };

  const allDotsExpanded = (
    <div className="flex items-center gap-1">
      {sellerStores.slice(0, 4).map((store) => {
        const mpDef = getMpDef(store.marketplace);
        if (!mpDef) return null;
        const MpIcon = mpDef.icon;
        return (
          <div
            key={store.id}
            className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${mpDef.color}`}
          >
            <MpIcon className="h-[7px] w-[7px] text-white" />
          </div>
        );
      })}
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto gap-2.5 rounded-xl border border-border/50 bg-secondary/40 px-3 py-2 hover:bg-secondary/60"
        >
          <AnimatePresence mode="wait">
            {(!allSelected && firstMpDef) ? (
              <motion.div
                key={selectedStoreIds.join("-")}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm ${gradientClass}`}
              >
                {Icon && <Icon className="h-3 w-3 text-white" />}
                {selectedStoreIds.length > 1 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {selectedStoreIds.length}
                  </span>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="all"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {sellerStores.length > 0 ? allDotsExpanded : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="hidden text-left sm:block overflow-hidden">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium leading-tight">
              Loja
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={label}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]"
              >
                {label}
              </motion.p>
            </AnimatePresence>
          </div>
          <ChevronDown className="ml-0.5 h-3.5 w-3.5 text-muted-foreground mx-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <Store className="h-3.5 w-3.5" />
          Lojas
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* "All" option */}
        <DropdownMenuItem
          onClick={handleToggleAll}
          className={`cursor-pointer gap-2.5 rounded-lg px-2 py-2 ${allSelected ? "bg-accent/10" : ""}`}
        >
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
              allSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
          </div>
          <span className={`flex-1 text-sm ${allSelected ? "font-semibold" : "font-medium"}`}>
            Todas as lojas
          </span>
          {allSelected && <Check className="h-4 w-4 shrink-0 text-accent" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Individual stores with checkboxes */}
        {sellerStores.map((store) => {
          const mpDef = getMpDef(store.marketplace);
          const MpIcon = mpDef?.icon ?? Store;
          const color = mpDef?.color ?? "from-gray-500 to-gray-600";
          const isChecked = !allSelected && selectedStoreIds.includes(store.id);

          return (
            <DropdownMenuItem
              key={store.id}
              onClick={() => handleToggleStore(store.id)}
              className={`cursor-pointer gap-2.5 rounded-lg px-2 py-2 ${isChecked ? "bg-accent/10" : ""}`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white`}
              >
                <MpIcon className="h-4 w-4" />
              </div>
              <span className={`flex-1 text-sm truncate ${isChecked ? "font-semibold" : "font-medium"}`}>
                {store.store_name}
              </span>
              <Checkbox
                checked={isChecked}
                className="h-3.5 w-3.5 pointer-events-none"
                tabIndex={-1}
              />
            </DropdownMenuItem>
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
