import { PageHeader } from "@/components/layout/PageHeader";
import { ShoppingBag } from "lucide-react";

export default function MLProdutos() {
  return (
    <div className="space-y-6">
      <PageHeader title="Produtos" subtitle="Mercado Livre" />
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShoppingBag className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Em breve</p>
        <p className="text-sm">Catálogo de produtos do Mercado Livre</p>
      </div>
    </div>
  );
}
