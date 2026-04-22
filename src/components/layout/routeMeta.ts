export const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/api": { title: "Vendas", subtitle: "" },
  "/api/estoque": { title: "Estoque", subtitle: "Gestão de estoque dos seus anúncios" },
  "/api/anuncios": { title: "Anúncios", subtitle: "Catálogo de produtos e anúncios ativos" },
  "/api/pedidos": { title: "Pedidos", subtitle: "Acompanhamento de pedidos e envios" },
  "/api/publicidade": { title: "Publicidade", subtitle: "Gestão e performance de publicidade" },
  "/api/financeiro":   { title: "Margem",   subtitle: "Análise de taxas, comissões e custo de frete" },
  "/api/reputacao":    { title: "Reputação",    subtitle: "Avaliações, reputação e histórico de feedback" },
  "/api/devolucoes":   { title: "Devoluções",   subtitle: "Gestão de devoluções e reclamações" },
  "/api/perguntas":    { title: "Mensagens",    subtitle: "Perguntas e mensagens dos compradores" },
  "/api/perfil": { title: "Perfil", subtitle: "Gerencie suas informações pessoais" },
  "/api/sellers": { title: "Sellers", subtitle: "Gerencie sellers e marketplaces ativos" },
  "/api/integracoes": {
    title: "Integrações",
    subtitle: "Conecte suas contas de marketplaces para sincronizar dados automaticamente",
  },
  "/api/metas": { title: "Metas", subtitle: "Defina metas mensais por loja e acompanhe no card de Vendas" },
  "/api/precos-custos": { title: "Preços e Custos", subtitle: "Preços de produtos, comissões, custos por venda e calculadora de precificação" },
  "/api/vendas-hora": { title: "Venda / Hora", subtitle: "Análise de vendas por hora do dia" },
  "/api/relatorios": { title: "Relatórios", subtitle: "Ferramentas de análise estratégica e comparativos" },
  "/api/usuarios": { title: "Usuários", subtitle: "Gerencie usuários e permissões do sistema" },
  "/api/monitoramento": { title: "Monitoramento", subtitle: "Estatísticas de banco de dados e capacidade do sistema" },
};

export function getRouteMeta(pathname: string) {
  return routeTitles[pathname] ?? { title: "Dashboard", subtitle: "" };
}
