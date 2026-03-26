import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AreaChart, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canAccess } from "@/config/roleAccess";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface SidebarNavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface EnvironmentSidebarProps {
  items: SidebarNavItem[];
  footerItem?: SidebarNavItem;
}

export function EnvironmentSidebar({ items, footerItem }: EnvironmentSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { role } = useAuth();

  const visibleItems = items.filter((item) => canAccess(role, item.path));
  const visibleFooterItem = footerItem && canAccess(role, footerItem.path) ? footerItem : null;

  const renderLink = (item: SidebarNavItem) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    const linkContent = (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 overflow-hidden",
          collapsed && "justify-center w-12 px-0",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span
          className={cn(
            "text-sm font-medium whitespace-nowrap transition-all duration-300 ease-in-out",
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
        "group relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-56"
      )}
    >
      <div className={cn("flex items-center gap-3 overflow-hidden py-6", collapsed ? "justify-center px-3" : "px-6")}>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow transition-transform duration-300">
          <AreaChart className="h-5 w-5 text-primary-foreground" />
        </div>
        <div
          className={cn(
            "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
        >
          <h1 className="text-lg font-semibold tracking-tight">Analytics Pro</h1>
          <p className="text-xs text-sidebar-foreground/60">Marketplace</p>
        </div>
      </div>

      

      <nav className={cn("flex flex-1 flex-col gap-1.5 overflow-y-auto pt-6 pb-4", collapsed ? "items-center px-2" : "px-3")}>
        {visibleItems.map(renderLink)}
        {visibleFooterItem && <div className="mt-auto pt-4">{renderLink(visibleFooterItem)}</div>}
      </nav>

      <button
        onClick={() => setCollapsed((current) => !current)}
        className={cn(
          "absolute top-1/2 -right-3.5 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-sidebar-foreground/70 shadow-sm transition-all duration-200 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
          collapsed ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
