import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";


const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Monitoramento de performance por marketplace" },
  "/vendas-diarias": { title: "Vendas", subtitle: "Acompanhe o desempenho diário de vendas" },
  "/importacao": { title: "Importação", subtitle: "Importe dados de vendas via CSV ou Excel" },
  "/configuracoes": { title: "Configurações", subtitle: "Configure metas e distribuição de PMT" },
  "/sellers": { title: "Sellers", subtitle: "Gerencie sellers e marketplaces ativos" },
  "/usuarios": { title: "Usuários", subtitle: "Gerencie usuários e permissões do sistema" },
  "/perfil": { title: "Perfil", subtitle: "Gerencie suas informações pessoais" },
  "/integracoes": { title: "Integrações", subtitle: "Conecte suas contas de marketplaces para sincronizar dados automaticamente" },
  "/api": { title: "Vendas", subtitle: "Visão geral de vendas e métricas" },
  "/api/estoque": { title: "Estoque", subtitle: "Gestão de estoque dos seus anúncios" },
  "/api/anuncios": { title: "Anúncios", subtitle: "Catálogo de produtos e anúncios ativos" },
  "/api/pedidos": { title: "Pedidos", subtitle: "Acompanhamento de pedidos e envios" },
  "/api/anuncios": { title: "Publicidade", subtitle: "Gestão e performance de publicidade" },
  "/api/financeiro":  { title: "Financeiro",  subtitle: "Análise de taxas, comissões e custo de frete" },
  "/api/reputacao":   { title: "Reputação",   subtitle: "Avaliações, reputação e histórico de feedback" },
  "/api/devolucoes":  { title: "Devoluções",  subtitle: "Gestão de devoluções e reclamações" },
  "/api/perguntas":   { title: "Perguntas",   subtitle: "Perguntas e respostas dos seus anúncios" },
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
