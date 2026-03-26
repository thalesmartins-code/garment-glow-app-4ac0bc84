import { LayoutShell } from "./LayoutShell";
import { ApiSidebar } from "./ApiSidebar";

export function ApiLayout() {
  return <LayoutShell sidebar={<ApiSidebar />} showSellerSwitcher={false} />;
}
