import { LayoutDashboard, DollarSign, Target, TrendingUp, Users, FileUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const kpis = [
  { title: "Receita Total", value: "R$ 0", subtitle: "Importe dados para visualizar", icon: DollarSign },
  { title: "% da Meta", value: "0%", subtitle: "Configure metas em Configurações", icon: Target },
  { title: "Crescimento YoY", value: "0%", subtitle: "vs ano anterior", icon: TrendingUp },
  { title: "Marketplaces", value: "0", subtitle: "Cadastre sellers para começar", icon: Users },
];

const Index = () => {
  return (
    <div className="dashboard-container">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground text-sm">Visão geral do desempenho de vendas nos marketplaces</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="dashboard-grid">
          {kpis.map((kpi) => (
            <div key={kpi.title} className="kpi-card">
              <div className="flex items-center justify-between mb-3">
                <span className="kpi-label">{kpi.title}</span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="kpi-value">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="dashboard-section">
          <div className="p-10 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Importe dados de vendas para visualizar o dashboard com KPIs, gráficos e tabelas.
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild>
                <Link to="/importacao">
                  <FileUp className="w-4 h-4 mr-2" />
                  Importar Dados
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/configuracoes">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar Metas
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <footer className="text-center py-6 text-sm text-muted-foreground">
          <p>Dashboard Executivo de Vendas • Dados baseados em importações</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
