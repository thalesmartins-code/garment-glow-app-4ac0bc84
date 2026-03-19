import { ArrowLeft, ClipboardList, Megaphone, Package, Plug, ShoppingBag, TrendingUp } from "lucide-react";
import { EnvironmentSidebar } from "./EnvironmentSidebar";

const mercadoLivreItems = [
  { icon: TrendingUp, label: "Vendas", path: "/mercado-livre" },
  { icon: Package, label: "Estoque", path: "/mercado-livre/estoque" },
  { icon: ShoppingBag, label: "Anúncios", path: "/mercado-livre/produtos" },
  { icon: ClipboardList, label: "Pedidos", path: "/mercado-livre/pedidos" },
  { icon: Megaphone, label: "Publicidade", path: "/mercado-livre/anuncios" },
  { icon: Plug, label: "Integrações", path: "/integracoes" },
];

const backToMainItem = {
  icon: ArrowLeft,
  label: "Voltar ao painel",
  path: "/",
};

export function MercadoLivreSidebar() {
  return <EnvironmentSidebar items={mercadoLivreItems} footerItem={backToMainItem} />;
}
