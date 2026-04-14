import { LayoutShell } from "./LayoutShell";
import { ApiSidebar } from "./ApiSidebar";
import { ApiMobileSidebar } from "./ApiMobileSidebar";
import { MarketplaceProvider } from "@/contexts/MarketplaceContext";

export function ApiLayout() {
  return (
    <MarketplaceProvider>
      <LayoutShell
        sidebar={<ApiSidebar />}
        mobileSidebar={<ApiMobileSidebar />}
        showSellerSwitcher={false}
        showMarketplaceSwitcher
        showSellerMarketplaceBar
      />
    </MarketplaceProvider>
  );
}
