import { Check, ChevronDown, Layers, Store } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
import { useMLStore } from "@/contexts/MLStoreContext";
import { Badge } from "@/components/ui/badge";

export function MarketplaceSwitcher() {
  const { marketplaces, selectedMarketplace, setSelectedMarketplace, connectedMarketplaces } =
    useMarketplace();
  const { stores: mlStores, selectedStore, setSelectedStore } = useMLStore();

  const hasMultipleMLStores = mlStores.length > 1;

  // Build the effective selected label/icon
  const isMLSubStore = selectedMarketplace.startsWith("ml-store:");
  const selectedMLStoreId = isMLSubStore ? selectedMarketplace.replace("ml-store:", "") : null;
  const selectedMLStore = selectedMLStoreId ? mlStores.find(s => s.ml_user_id === selectedMLStoreId) : null;

  const selected = isMLSubStore
    ? null
    : selectedMarketplace === "all"
      ? null
      : marketplaces.find((m) => m.id === selectedMarketplace);

  const mlMarketplace = marketplaces.find(m => m.id === "mercado-livre");

  // For single ML store with custom name, show it when ML is selected
  const singleMLName = !hasMultipleMLStores && mlStores.length === 1 && mlStores[0].custom_name
    ? mlStores[0].custom_name
    : null;

  const label = selectedMLStore
    ? `ML - ${selectedMLStore.displayName}`
    : selected
      ? (selected.id === "mercado-livre" && singleMLName ? singleMLName : selected.name)
      : "Todos";
  const Icon = selectedMLStore ? mlMarketplace?.icon : selected?.icon;
  const gradientClass = selectedMLStore
    ? mlMarketplace?.color ?? ""
    : selected?.color ?? "";

  const handleSelectMarketplace = (id: string) => {
    setSelectedMarketplace(id);
    // When selecting a non-ML marketplace or "all", reset ML store to "all"
    if (!id.startsWith("ml-store:") && id !== "mercado-livre") {
      setSelectedStore("all");
    }
  };

  const handleSelectMLSubStore = (mlUserId: string) => {
    setSelectedMarketplace(`ml-store:${mlUserId}`);
    setSelectedStore(mlUserId);
  };

  const handleSelectMLAll = () => {
    setSelectedMarketplace("mercado-livre");
    setSelectedStore("all");
  };

  const allDotsExpanded = (
    <div className="flex items-center gap-1">
      {marketplaces.map((mp) => {
        const MpIcon = mp.icon;
        return (
          <div
            key={mp.id}
            className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${mp.color}`}
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
            {(selected || selectedMLStore) ? (
              <motion.div
                key={selectedMLStore ? `ml-${selectedMLStore.ml_user_id}` : selected?.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm ${gradientClass}`}
              >
                {Icon && <Icon className="h-3 w-3 text-white" />}
              </motion.div>
            ) : (
              <motion.div
                key="all"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {allDotsExpanded}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="hidden text-left sm:block overflow-hidden">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium leading-tight">
              Marketplace
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
          Marketplace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* "All" option */}
        <DropdownMenuItem
          onClick={() => handleSelectMarketplace("all")}
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

        {connectedMarketplaces.map((mp) => {
          const isML = mp.id === "mercado-livre";
          const MpIcon = mp.icon;

          // If ML has multiple stores, render sub-items instead
          if (isML && hasMultipleMLStores) {
            return (
              <div key={mp.id}>
                {/* ML header - selects "all ML stores" */}
                <DropdownMenuItem
                  onClick={handleSelectMLAll}
                  className={`cursor-pointer gap-2.5 rounded-lg px-2 py-2 ${
                    selectedMarketplace === "mercado-livre" ? "bg-accent/10" : ""
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${mp.color} text-white`}
                  >
                    <MpIcon className="h-4 w-4" />
                  </div>
                  <span
                    className={`flex-1 text-sm ${selectedMarketplace === "mercado-livre" ? "font-semibold" : "font-medium"}`}
                  >
                    {mp.name}
                  </span>
                  {selectedMarketplace === "mercado-livre" && (
                    <Check className="h-4 w-4 shrink-0 text-accent" />
                  )}
                </DropdownMenuItem>

                {/* Sub-stores */}
                {mlStores.map((store) => {
                  const storeKey = `ml-store:${store.ml_user_id}`;
                  const isActive = selectedMarketplace === storeKey;
                  return (
                    <DropdownMenuItem
                      key={storeKey}
                      onClick={() => handleSelectMLSubStore(store.ml_user_id)}
                      className={`cursor-pointer gap-2.5 rounded-lg px-2 py-2 pl-5 ${
                        isActive ? "bg-accent/10" : ""
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${mp.color} text-white`}
                      >
                        <MpIcon className="h-3 w-3" />
                      </div>
                      <span
                        className={`flex-1 text-sm truncate ${isActive ? "font-semibold" : "font-medium"}`}
                      >
                        {store.displayName}
                      </span>
                      {isActive && <Check className="h-4 w-4 shrink-0 text-accent" />}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            );
          }

          const isActive = selectedMarketplace === mp.id;

          return (
            <DropdownMenuItem
              key={mp.id}
              onClick={() => handleSelectMarketplace(mp.id)}
              className={`cursor-pointer gap-2.5 rounded-lg px-2 py-2 ${
                isActive ? "bg-accent/10" : ""
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${mp.color} text-white`}
              >
                <MpIcon className="h-4 w-4" />
              </div>
              <span
                className={`flex-1 text-sm ${isActive ? "font-semibold" : "font-medium"}`}
              >
                {mp.id === "mercado-livre" && singleMLName ? singleMLName : mp.name}
              </span>
              {isActive && <Check className="h-4 w-4 shrink-0 text-accent" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
