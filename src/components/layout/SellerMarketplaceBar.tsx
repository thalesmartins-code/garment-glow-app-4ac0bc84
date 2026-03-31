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
import { StoreGroupSelector } from "./StoreGroupSelector";

interface Props {
  className?: string;
  showStores?: boolean;
}

export function SellerMarketplaceBar({ className, showStores = true }: Props) {
  const {
    activeSellers,
    sellers,
    selectedSeller,
    setSelectedSeller,
  } = useSeller();

  const displaySellers = activeSellers.length > 0 ? activeSellers : sellers;
  const hasStores = (selectedSeller?.stores ?? []).some((s) => s.is_active);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-2 py-1.5 shadow-sm",
        className
      )}
    >
      {/* Seller dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-2 px-2 text-sm font-medium hover:bg-transparent hover:text-inherit"
          >
            <div className="relative flex items-center gap-2 min-w-[130px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedSeller?.id ?? "empty"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute inset-0 flex items-center gap-2"
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
            </div>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 rounded-xl p-1">
          {displaySellers.map((seller) => (
            <DropdownMenuItem
              key={seller.id}
              onClick={() => setSelectedSeller(seller.id)}
              className={cn(
                "cursor-pointer gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors duration-150",
                selectedSeller?.id === seller.id
                  ? "bg-primary/8 text-primary font-medium"
                  : "hover:bg-accent/70"
              )}
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

      {/* Divider + store group selector */}
      {hasStores && (
        <>
          <div className="h-5 w-px shrink-0 bg-border" />
          <StoreGroupSelector />
        </>
      )}
    </div>
  );
}
