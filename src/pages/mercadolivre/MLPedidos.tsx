import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { Package } from "lucide-react";

export default function MLPedidos() {
  return (
    <div className="space-y-6">
      <MLPageHeader title="Pedidos" />

      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Package className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Em breve</p>
        <p className="text-sm">O gerenciamento de pedidos estará disponível em uma atualização futura.</p>
      </div>
    </div>
  );
}
