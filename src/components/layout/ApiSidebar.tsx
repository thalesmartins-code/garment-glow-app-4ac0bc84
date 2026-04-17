import {
  Target,
  ClipboardList,
  Layers,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Package,
  PackageX,
  Plug,
  Receipt,
  DollarSign,
  Settings2,
  Handshake,
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
          { icon: Megaphone,   label: "Publicidade", path: "/api/publicidade" },
          { icon: Receipt,     label: "Margem",      path: "/api/financeiro" },
        ],
      },
      {
        icon: Layers,
        label: "Operações",
        path: "/api/estoque",
        noSelfLink: true,
        children: [
          { icon: ShoppingBag,   label: "Anúncios", path: "/api/anuncios" },
          { icon: Package,       label: "Estoque",  path: "/api/estoque"  },
          { icon: ClipboardList, label: "Pedidos",  path: "/api/pedidos"  },
          { icon: DollarSign,    label: "Preços e Custos", path: "/api/precos-custos" },
        ],
      },
      {
        icon: Handshake,
        label: "Pós-venda",
        path: "/api/reputacao",
        noSelfLink: true,
        children: [
          { icon: Star,          label: "Reputação",  path: "/api/reputacao"  },
          { icon: PackageX,      label: "Devoluções", path: "/api/devolucoes" },
          { icon: MessageCircle, label: "Mensagens",  path: "/api/perguntas"  },
        ],
      },
      {
        icon: Settings2,
        label: "Configurações",
        path: "/api/metas",
        noSelfLink: true,
        children: [
          { icon: Target,   label: "Metas",          path: "/api/metas"          },
          { icon: Users,    label: "Sellers",        path: "/api/sellers"        },
          { icon: Plug,     label: "Integrações",    path: "/api/integracoes"    },
        ],
      },
    ],
  },
];

export function ApiSidebar() {
  return <EnvironmentSidebar sections={apiSections} />;
}

