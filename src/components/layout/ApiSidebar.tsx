import {
  ArrowLeft,
  ClipboardList,
  Megaphone,
  MessageCircleQuestion,
  Package,
  PackageX,
  Plug,
  Receipt,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { EnvironmentSidebar, type SidebarNavSection } from "./EnvironmentSidebar";

const apiSections: SidebarNavSection[] = [
  {
    // Unlabelled — top-level overview
    items: [
      { icon: TrendingUp, label: "Vendas", path: "/api" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { icon: Package,       label: "Estoque",  path: "/api/estoque"  },
      { icon: ShoppingBag,   label: "Anúncios", path: "/api/produtos" },
      { icon: ClipboardList, label: "Pedidos",  path: "/api/pedidos"  },
    ],
  },
  {
    label: "Crescimento",
    items: [
      { icon: Megaphone, label: "Publicidade", path: "/api/anuncios"   },
      { icon: Receipt,   label: "Financeiro",  path: "/api/financeiro" },
    ],
  },
  {
    label: "Relacionamento",
    items: [
      { icon: Star,                  label: "Reputação",  path: "/api/reputacao"  },
      { icon: PackageX,              label: "Devoluções", path: "/api/devolucoes" },
      { icon: MessageCircleQuestion, label: "Perguntas",  path: "/api/perguntas"  },
    ],
  },
  {
    label: "Sistema",
    items: [
      { icon: Users, label: "Sellers",     path: "/api/sellers"     },
      { icon: Plug,  label: "Integrações", path: "/api/integracoes" },
    ],
  },
];

const backToMainItem = {
  icon: ArrowLeft,
  label: "Voltar ao painel",
  path: "/",
};

export function ApiSidebar() {
  return (
    <EnvironmentSidebar
      sections={apiSections}
      footerItem={backToMainItem}
    />
  );
}
