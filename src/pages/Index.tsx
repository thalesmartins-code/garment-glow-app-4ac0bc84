import { LayoutDashboard, DollarSign, Target, TrendingUp, Users, FileUp, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary shadow-glow">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Visão geral do desempenho de vendas nos marketplaces</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="relative overflow-hidden border border-border/50 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <kpi.icon className="w-4 h-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      <Card className="border border-border/50 shadow-md">
        <CardContent className="p-10 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">Nenhum dado disponível</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Importe dados de vendas para visualizar o dashboard com KPIs, gráficos e tabelas.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild className="bg-gradient-primary shadow-glow hover:opacity-90 transition-opacity">
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
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-muted-foreground">
        <p>Dashboard Executivo de Vendas • Dados baseados em importações</p>
      </footer>
    </div>
  );
};

export default Index;
