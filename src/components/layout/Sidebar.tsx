import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  FileUp,
  SlidersHorizontal,
  Users,
  ChevronLeft,
  ChevronRight,
  AreaChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { icon: BarChart3, label: "Dashboard", path: "/" },
  { icon: TrendingUp, label: "Vendas", path: "/vendas-diarias" },
  { icon: FileUp, label: "Importação", path: "/importacao" },
  { icon: SlidersHorizontal, label: "Configurações", path: "/configuracoes" },
  { icon: Users, label: "Sellers", path: "/sellers" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const renderLink = (item: { icon: any; label: string; path: string }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    const linkContent = (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 overflow-hidden",
          collapsed && "justify-center w-12 px-0",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span
          className={cn(
            "font-medium text-sm whitespace-nowrap transition-all duration-300 ease-in-out",
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

  return (
    <aside
      className={cn(
        "group relative flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 py-6 border-b border-sidebar-border overflow-hidden", collapsed ? "px-3 justify-center" : "px-6")}>
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
        {navItems.map(renderLink)}
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
