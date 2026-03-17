import { LayoutShell } from "./LayoutShell";
import { MercadoLivreSidebar } from "./MercadoLivreSidebar";

export function MercadoLivreLayout() {
  return <LayoutShell sidebar={<MercadoLivreSidebar />} showSellerSwitcher={false} />;
}
