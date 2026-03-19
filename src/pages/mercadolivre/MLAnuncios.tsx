import { Megaphone } from "lucide-react";

export default function MLAnuncios() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Megaphone className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Em breve</p>
        <p className="text-sm">Gestão de publicidade e campanhas do Mercado Livre</p>
      </div>
    </div>
  );
}
