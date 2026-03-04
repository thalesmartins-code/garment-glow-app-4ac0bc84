import { Bell, Check, ChevronDown, Store, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { selectedSeller, setSelectedSeller, activeSellers } = useSeller();
  const { profile, role, signOut } = useAuth();

  const displayName = profile?.full_name || "Usuário";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = role === "admin" ? "Admin" : role === "editor" ? "Editor" : "Viewer";

  return (
    <header className="flex items-center justify-between px-8 py-6 bg-card border-b border-border">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Seller Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2.5 h-10 px-3 rounded-xl bg-secondary/50 hover:bg-secondary border-0"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-accent-foreground text-[11px] font-bold"
                style={{ background: "var(--gradient-primary)" }}
              >
                {selectedSeller.initials}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline">
                {selectedSeller.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1.5">
              <Store className="w-3.5 h-3.5" />
              Trocar Seller
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {activeSellers.map((seller) => {
              const isActive = seller.id === selectedSeller.id;
              return (
                <DropdownMenuItem
                  key={seller.id}
                  onClick={() => setSelectedSeller(seller.id)}
                  className={`gap-2.5 rounded-lg px-2 py-2 cursor-pointer ${
                    isActive ? "bg-accent/10" : ""
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      isActive
                        ? "text-accent-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                    style={isActive ? { background: "var(--gradient-primary)" } : undefined}
                  >
                    {seller.initials}
                  </div>
                  <span className={`text-sm flex-1 ${isActive ? "font-semibold" : "font-medium"}`}>
                    {seller.name}
                  </span>
                  {isActive && <Check className="w-4 h-4 text-accent shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative hover:bg-secondary/50 rounded-xl">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-3 pl-2 pr-4 hover:bg-secondary/50 hover:text-foreground rounded-xl">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>Configurações</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}