import { MessageCircleQuestion } from "lucide-react";
import { SellerMarketplaceBar } from "@/components/layout/SellerMarketplaceBar";

export default function MLPerguntas() {
  return (
    <div className="space-y-6">
      <SellerMarketplaceBar />
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <MessageCircleQuestion className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Em breve</p>
        <p className="text-sm">Perguntas e respostas dos seus anúncios</p>
      </div>
    </div>
  );
}
