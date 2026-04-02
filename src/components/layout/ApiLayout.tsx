import { LayoutShell } from "./LayoutShell";
import { ApiSidebar } from "./ApiSidebar";
import { MarketplaceProvider } from "@/contexts/MarketplaceContext";

export function ApiLayout() {
  return (
    <MarketplaceProvider>
      <LayoutShell sidebar={<ApiSidebar />} showSellerSwitcher={false} showMarketplaceSwitcher showSellerMarketplaceBar />
    </MarketplaceProvider>
  );
}
