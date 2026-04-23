import { LayoutShell } from "./LayoutShell";
import { ApiSidebar } from "./ApiSidebar";
import { ApiMobileSidebar } from "./ApiMobileSidebar";

export function ApiLayout() {
  return (
    <LayoutShell
      sidebar={<ApiSidebar />}
      mobileSidebar={<ApiMobileSidebar />}
      showSellerSwitcher={false}
      showSellerMarketplaceBar
    />
  );
}
