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
  /** Marks item as a placeholder — renders disabled with "Em breve" badge */
  comingSoon?: boolean;
}

export interface SidebarNavSection {
  /** Section header label. Omit for the first unlabelled group. */
  label?: string;
  items: SidebarNavItem[];
}

interface EnvironmentSidebarProps {
  /** Pass either flat items (legacy) or sections (new) */
  sections?: SidebarNavSection[];
  items?: SidebarNavItem[];
  footerItem?: SidebarNavItem;
}

export function EnvironmentSidebar({ sections, items, footerItem }: EnvironmentSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { role } = useAuth();

  // Normalise: convert flat items to a single unnamed section for backwards compat
  const resolvedSections: SidebarNavSection[] = sections ?? (items ? [{ items }] : []);

  const renderLink = (item: SidebarNavItem) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    if (item.comingSoon) {
      const inner = (
        <span
          key={item.path}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 opacity-50 cursor-not-allowed select-none overflow-hidden",
            collapsed && "justify-center w-12 px-0",
            "text-sidebar-foreground/50"
          )}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span
            className={cn(
              "flex flex-1 items-center justify-between text-sm font-medium whitespace-nowrap transition-all duration-300 ease-in-out",
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}
          >
            {item.label}
            <span className="ml-1.5 rounded-full bg-sidebar-foreground/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
              breve
            </span>
          </span>
        </span>
      );

      if (collapsed) {
        return (
          <Tooltip key={item.path} delayDuration={0}>
            <TooltipTrigger asChild>{inner}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.label} — Em breve
            </TooltipContent>
          </Tooltip>
        );
      }
      return inner;
    }

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
      {/* Logo / brand */}
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

      {/* Nav sections */}
      <nav className={cn("flex flex-1 flex-col overflow-y-auto pb-4", collapsed ? "items-center px-2 gap-1.5" : "px-3")}>
        {resolvedSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(
            (item) => item.comingSoon || canAccess(role, item.path)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className={cn("flex flex-col", sIdx === 0 ? "pt-2" : "pt-3")}>
              {/* Section label */}
              {section.label && (
                <div
                  className={cn(
                    "mb-1 overflow-hidden transition-all duration-300 ease-in-out",
                    collapsed ? "h-px w-8 bg-sidebar-border/60 mx-auto my-2 rounded-full" : "px-3 pb-1"
                  )}
                >
                  {!collapsed && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 select-none">
                      {section.label}
                    </span>
                  )}
                </div>
              )}

              {/* Items */}
              <div className={cn("flex flex-col gap-0.5", collapsed && "items-center gap-1.5")}>
                {visibleItems.map(renderLink)}
              </div>
            </div>
          );
        })}

        {/* Footer item */}
        {footerItem && canAccess(role, footerItem.path) && (
          <div className={cn("mt-auto pt-4 border-t border-sidebar-border/40", collapsed ? "w-full flex justify-center" : "")}>
            {renderLink(footerItem)}
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
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
