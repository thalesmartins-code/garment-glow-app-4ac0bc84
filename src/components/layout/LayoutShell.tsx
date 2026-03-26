import { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { getRouteMeta } from "./routeMeta";

interface LayoutShellProps {
  sidebar: ReactNode;
  showSellerSwitcher?: boolean;
  showMarketplaceSwitcher?: boolean;
}

export function LayoutShell({ sidebar, showSellerSwitcher = true, showMarketplaceSwitcher = false }: LayoutShellProps) {
  const location = useLocation();
  const { title, subtitle } = getRouteMeta(location.pathname);

  return (
    <div className="flex h-screen bg-background">
      {sidebar}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} showSellerSwitcher={showSellerSwitcher} showMarketplaceSwitcher={showMarketplaceSwitcher} />
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
