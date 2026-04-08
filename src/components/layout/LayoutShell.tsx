import { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { getRouteMeta } from "./routeMeta";

interface LayoutShellProps {
  sidebar: ReactNode;
  showSellerSwitcher?: boolean;
  showMarketplaceSwitcher?: boolean;
  showSellerMarketplaceBar?: boolean;
}

const HIDE_SELLER_SWITCHER_ROUTES = ["/sheets/integracoes", "/sheets/sellers", "/sheets/importacao", "/api/integracoes", "/api/sellers", "/api/importacao"];

export function LayoutShell({ sidebar, showSellerSwitcher = true, showMarketplaceSwitcher = false, showSellerMarketplaceBar = false }: LayoutShellProps) {
  const location = useLocation();
  const { title, subtitle } = getRouteMeta(location.pathname);
  const hideSwitcher = HIDE_SELLER_SWITCHER_ROUTES.includes(location.pathname);

  return (
    <div className="flex h-screen bg-background">
      {sidebar}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} showSellerSwitcher={!hideSwitcher && showSellerSwitcher} showMarketplaceSwitcher={showMarketplaceSwitcher} showSellerMarketplaceBar={!hideSwitcher && showSellerMarketplaceBar} />
        <main className="flex-1 overflow-auto px-8 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
