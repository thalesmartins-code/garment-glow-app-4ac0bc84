import { PageHeader } from "@/components/layout/PageHeader";
import { ClipboardList } from "lucide-react";

export default function MLPedidos() {
  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos" subtitle="Mercado Livre" />
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ClipboardList className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Em breve</p>
        <p className="text-sm">Lista de pedidos do Mercado Livre</p>
      </div>
    </div>
  );
}
