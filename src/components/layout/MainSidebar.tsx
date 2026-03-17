import { BarChart3, FileUp, Plug, ShieldCheck, Store, TrendingUp, Users } from "lucide-react";
import { EnvironmentSidebar } from "./EnvironmentSidebar";

const mainItems = [
  { icon: BarChart3, label: "Dashboard", path: "/" },
  { icon: TrendingUp, label: "Vendas", path: "/vendas-diarias" },
  { icon: FileUp, label: "Importação", path: "/importacao" },
  { icon: Users, label: "Sellers", path: "/sellers" },
  { icon: Plug, label: "Integrações", path: "/integracoes" },
  { icon: ShieldCheck, label: "Usuários", path: "/usuarios" },
  { icon: Store, label: "Mercado Livre", path: "/mercado-livre" },
];

export function MainSidebar() {
  return <EnvironmentSidebar items={mainItems} />;
}
