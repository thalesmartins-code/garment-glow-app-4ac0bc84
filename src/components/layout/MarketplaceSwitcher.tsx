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
import { Badge } from "@/components/ui/badge";

export function MarketplaceSwitcher() {
  const { marketplaces, selectedMarketplace, setSelectedMarketplace, connectedMarketplaces } =
    useMarketplace();

  const selected =
    selectedMarketplace === "all"
      ? null
      : marketplaces.find((m) => m.id === selectedMarketplace);

  const label = selected ? selected.name : "Todos";
  const Icon = selected?.icon;
  const gradientClass = selected?.color ?? "";

  const allDotsExpanded = (
    <div className="flex items-center gap-1">
      {marketplaces.map((mp) => {
        const MpIcon = mp.icon;
        return (
          <div
            key={mp.id}
            className={`flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br ${mp.color}`}
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
            {selected ? (
              <motion.div
                key={selected.id}
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
                className="text-xs font-semibold text-foreground leading-tight"
              >
                {label}
              </motion.p>
            </AnimatePresence>
          </div>
          <ChevronDown className="ml-0.5 text-muted-foreground w-[13px] h-[13px] mx-0" />
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
