import {
  ArrowLeft,
  ClipboardList,
  Layers,
  LayoutDashboard,
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
    items: [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        path: "/api",
        noSelfLink: true,
        children: [
          { icon: TrendingUp,  label: "Vendas",      path: "/api"            },
          { icon: ShoppingBag, label: "Anúncios",    path: "/api/produtos"   },
          { icon: Megaphone,   label: "Publicidade", path: "/api/anuncios"   },
          { icon: Receipt,     label: "Financeiro",  path: "/api/financeiro" },
        ],
      },
      {
        icon: Layers,
        label: "Operações",
        path: "/api/estoque",
        noSelfLink: true,
        children: [
          { icon: Package,       label: "Estoque", path: "/api/estoque" },
          { icon: ClipboardList, label: "Pedidos", path: "/api/pedidos" },
        ],
      },
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
