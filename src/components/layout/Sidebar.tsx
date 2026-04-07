import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  FileUp,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AreaChart,
  ShieldCheck,
  Plug,
  Store,
  Package,
  ShoppingBag,
  ClipboardList,
  Megaphone,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canAccess } from "@/config/roleAccess";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const baseNavItems = [
  { icon: BarChart3, label: "Dashboard", path: "/" },
  { icon: TrendingUp, label: "Vendas", path: "/vendas-diarias" },
  { icon: FileUp, label: "Importação", path: "/importacao" },
  { icon: Users, label: "Sellers", path: "/sellers" },
  { icon: Plug, label: "Integrações", path: "/integracoes" },
];

const mlSubItems = [
  { icon: TrendingUp, label: "Vendas", path: "/api" },
  { icon: Package, label: "Estoque", path: "/api/estoque" },
  { icon: ShoppingBag, label: "Anúncios", path: "/api/produtos" },
  { icon: ClipboardList, label: "Pedidos",     path: "/api/pedidos" },
  { icon: Megaphone,    label: "Publicidade", path: "/api/anuncios" },
  { icon: Receipt,      label: "Financeiro",  path: "/api/financeiro" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { role } = useAuth();

  const allNavItems = [...baseNavItems, { icon: ShieldCheck, label: "Usuários", path: "/usuarios" }];
  const navItems = allNavItems.filter((item) => canAccess(role, item.path));
  const visibleMlSubItems = mlSubItems.filter((item) => canAccess(role, item.path));
  const isMLActive = location.pathname.startsWith("/api");
  const showMLGroup = visibleMlSubItems.length > 0;

  const renderLink = (item: { icon: any; label: string; path: string }, isSubItem = false) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    const linkContent = (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 rounded-xl transition-all duration-200 overflow-hidden",
          isSubItem ? "px-3 py-2 text-[13px]" : "px-3 py-2.5",
          collapsed && "justify-center w-12 px-0",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className={cn("flex-shrink-0", isSubItem ? "w-4 h-4" : "w-5 h-5")} />
        <span
          className={cn(
            "font-medium whitespace-nowrap transition-all duration-300 ease-in-out",
            isSubItem ? "text-[13px]" : "text-sm",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
        >
          {item.label}
        </span>
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.path} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }
    return linkContent;
  };

  const renderMLGroup = () => {
    if (!showMLGroup) return null;

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to="/api"
              className={cn(
                "flex items-center justify-center w-12 py-2.5 rounded-xl transition-all duration-200",
                isMLActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Store className="w-5 h-5 flex-shrink-0" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="p-0">
            <div className="flex flex-col py-1">
              {visibleMlSubItems.map((sub) => (
                <Link
                  key={sub.path}
                  to={sub.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors",
                    location.pathname === sub.path && "font-medium text-primary"
                  )}
                >
                  <sub.icon className="w-4 h-4" />
                  {sub.label}
                </Link>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Collapsible defaultOpen={isMLActive}>
        <CollapsibleTrigger className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left",
          isMLActive
            ? "text-sidebar-foreground font-medium"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}>
          <Store className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm flex-1">Mercado Livre</span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 [&[data-state=open]]:rotate-0 rotate-[-90deg]" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-3 pl-3 border-l border-sidebar-border space-y-0.5 mt-1">
            {visibleMlSubItems.map((sub) => renderLink(sub, true))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside
      className={cn(
        "group relative flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 py-6 overflow-hidden", collapsed ? "px-3 justify-center" : "px-6")}>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-primary shadow-glow flex-shrink-0 transition-transform duration-300">
          <AreaChart className="w-5 h-5 text-white" />
        </div>
        <div className={cn("transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
          <h1 className="font-semibold text-lg tracking-tight">Analytics Pro</h1>
          <p className="text-xs text-sidebar-foreground/60">Marketplace</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 pt-6 pb-4 space-y-1.5 overflow-y-auto", collapsed ? "px-2 flex flex-col items-center" : "px-3")}>
        {navItems.map((item) => renderLink(item))}
        {renderMLGroup()}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -right-3.5 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-sidebar-accent border border-sidebar-border text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground transition-all duration-200 shadow-sm",
          collapsed ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
}
