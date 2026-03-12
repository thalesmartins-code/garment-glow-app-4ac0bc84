import { PageHeader } from "@/components/layout/PageHeader";
import { Package } from "lucide-react";

export default function MLEstoque() {
  return (
    <div className="space-y-6">
      <PageHeader title="Estoque" subtitle="Mercado Livre" />
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Package className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Em breve</p>
        <p className="text-sm">Gestão de estoque do Mercado Livre</p>
      </div>
    </div>
  );
}
