import { Bell, Check, ChevronDown, DatabaseZap, LogOut, SlidersHorizontal, Store, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSeller } from "@/contexts/SellerContext";
import { useAuth } from "@/contexts/AuthContext";
import { MarketplaceSwitcher } from "./MarketplaceSwitcher";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showSellerSwitcher?: boolean;
  showMarketplaceSwitcher?: boolean;
}

export function Header({ title, subtitle, showSellerSwitcher = true, showMarketplaceSwitcher = false }: HeaderProps) {
  const { selectedSeller, setSelectedSeller, activeSellers } = useSeller();
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isApi = location.pathname.startsWith("/api");
  const profilePath = isApi ? "/api/perfil" : "/perfil";
  const settingsPath = isApi ? "/api/integracoes" : "/sheets/configuracoes";
  const displayName = profile?.full_name || "Usuário";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = role === "admin" ? "Admin" : role === "editor" ? "Editor" : "Viewer";

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-8 py-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {showMarketplaceSwitcher && <MarketplaceSwitcher />}
        {showSellerSwitcher && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 gap-2.5 rounded-xl border-0 bg-secondary/50 px-3 hover:bg-secondary"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold text-accent-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {selectedSeller?.initials ?? "?"}
                </div>
                <span className="hidden text-sm font-medium text-foreground sm:inline">{selectedSeller?.name ?? "Seller"}</span>
                <ChevronDown className="ml-0.5 h-3.5 w-3.5 text-muted-foreground mx-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
              <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                <Store className="h-3.5 w-3.5" />
                Trocar Seller
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {activeSellers.map((seller) => {
                const isActive = seller.id === selectedSeller?.id;

                return (
                  <DropdownMenuItem
                    key={seller.id}
                    onClick={() => setSelectedSeller(seller.id)}
                    className={`cursor-pointer gap-2.5 rounded-lg px-2 py-2 ${isActive ? "bg-accent/10" : ""}`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                        isActive ? "text-accent-foreground" : "bg-secondary text-secondary-foreground"
                      }`}
                      style={isActive ? { background: "var(--gradient-primary)" } : undefined}
                    >
                      {seller.initials}
                    </div>
                    <span className={`flex-1 text-sm ${isActive ? "font-semibold" : "font-medium"}`}>
                      {seller.name}
                    </span>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-accent" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-secondary/50">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-3 rounded-xl pl-2 pr-4 hover:bg-secondary/50 hover:text-foreground">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-accent text-sm font-medium text-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(profilePath)}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(settingsPath)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
