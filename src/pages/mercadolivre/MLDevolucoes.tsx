import { PackageX } from "lucide-react";
import { SellerMarketplaceBar } from "@/components/layout/SellerMarketplaceBar";

export default function MLDevolucoes() {
  return (
    <div className="space-y-6">
      <SellerMarketplaceBar />
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <PackageX className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Em breve</p>
        <p className="text-sm">Gestão de devoluções e reclamações do Mercado Livre</p>
      </div>
    </div>
  );
}
