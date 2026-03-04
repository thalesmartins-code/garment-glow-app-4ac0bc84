import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";


const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Monitoramento de performance por marketplace" },
  "/vendas-diarias": { title: "Vendas", subtitle: "Acompanhe o desempenho diário de vendas" },
  "/importacao": { title: "Importação", subtitle: "Importe dados de vendas via CSV ou Excel" },
  "/configuracoes": { title: "Configurações", subtitle: "Configure metas e distribuição de PMT" },
  "/sellers": { title: "Sellers", subtitle: "Gerencie sellers e marketplaces ativos" },
};

export function AppLayout() {
  const location = useLocation();
  const { title, subtitle } = routeTitles[location.pathname] ?? { title: "Dashboard", subtitle: "" };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
      
    </div>
  );
}
