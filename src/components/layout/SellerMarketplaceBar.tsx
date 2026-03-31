import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSeller } from "@/contexts/SellerContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  className?: string;
}

export function SellerMarketplaceBar({ className }: Props) {
  const {
    activeSellers,
    sellers,
    selectedSeller,
    setSelectedSeller,
    selectedMarketplace,
    setSelectedMarketplace,
    availableMarketplaces,
  } = useSeller();

  const displaySellers = activeSellers.length > 0 ? activeSellers : sellers;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl border border-border/60 bg-card px-2 py-1.5 shadow-sm",
        className
      )}
    >
      {/* Seller dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-2 px-2 text-sm font-medium hover:bg-accent/60"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedSeller?.id ?? "empty"}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center gap-2"
              >
                {selectedSeller?.logo_url ? (
                  <img
                    src={selectedSeller.logo_url}
                    alt={selectedSeller.name}
                    className="h-5 w-5 rounded object-cover"
                  />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                    {selectedSeller?.initials ?? "?"}
                  </span>
                )}
                <span className="max-w-[110px] truncate">{selectedSeller?.name ?? "Seller"}</span>
              </motion.div>
            </AnimatePresence>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 rounded-xl p-1">
          {displaySellers.map((seller) => (
            <DropdownMenuItem
              key={seller.id}
              onClick={() => setSelectedSeller(seller.id)}
              className="cursor-pointer gap-2.5 rounded-lg px-2 py-2"
            >
              {seller.logo_url ? (
                <img
                  src={seller.logo_url}
                  alt={seller.name}
                  className="h-5 w-5 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                  {seller.initials}
                </span>
              )}
              <span className="flex-1 truncate text-sm">{seller.name}</span>
              {selectedSeller?.id === seller.id && (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          {displaySellers.length === 0 && (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              Nenhum seller ativo
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Divider */}
      {availableMarketplaces.length > 0 && (
        <div className="h-5 w-px shrink-0 bg-border" />
      )}

      {/* Marketplace tabs */}
      {availableMarketplaces.length > 0 && (
        <div className="flex items-center gap-0.5">
          <Button
            variant={selectedMarketplace === "all" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => setSelectedMarketplace("all")}
          >
            Todos
          </Button>
          {availableMarketplaces.map((mp) => (
            <Button
              key={mp.id}
              variant={selectedMarketplace === mp.id ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 px-2.5 text-xs"
              onClick={() => setSelectedMarketplace(mp.id)}
            >
              <span>{mp.logo}</span>
              <span className="hidden sm:inline">{mp.name}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
