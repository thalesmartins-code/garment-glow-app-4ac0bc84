import { ArrowLeft, ClipboardList, Clock, Megaphone, Package, Plug, ShoppingBag, TrendingUp, Upload, Users } from "lucide-react";
import { EnvironmentSidebar } from "./EnvironmentSidebar";

const apiItems = [
  { icon: TrendingUp, label: "Vendas", path: "/api" },
  { icon: Package, label: "Estoque", path: "/api/estoque" },
  { icon: ShoppingBag, label: "Anúncios", path: "/api/produtos" },
  { icon: ClipboardList, label: "Pedidos", path: "/api/pedidos" },
  { icon: Megaphone, label: "Publicidade", path: "/api/anuncios" },
  { icon: Upload, label: "Importação", path: "/api/importacao" },
  
  { icon: Users, label: "Sellers", path: "/api/sellers" },
  { icon: Plug, label: "Integrações", path: "/api/integracoes" },
];

const backToMainItem = {
  icon: ArrowLeft,
  label: "Voltar ao painel",
  path: "/",
};

export function ApiSidebar() {
  return (
    <EnvironmentSidebar
      items={apiItems}
      footerItem={backToMainItem}
    />
  );
}
