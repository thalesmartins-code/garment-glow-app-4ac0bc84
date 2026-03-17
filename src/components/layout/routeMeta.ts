export const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Monitoramento de performance por marketplace" },
  "/vendas-diarias": { title: "Vendas", subtitle: "Acompanhe o desempenho diário de vendas" },
  "/importacao": { title: "Importação", subtitle: "Importe dados de vendas via CSV ou Excel" },
  "/configuracoes": { title: "Configurações", subtitle: "Configure metas e distribuição de PMT" },
  "/sellers": { title: "Sellers", subtitle: "Gerencie sellers e marketplaces ativos" },
  "/usuarios": { title: "Usuários", subtitle: "Gerencie usuários e permissões do sistema" },
  "/perfil": { title: "Perfil", subtitle: "Gerencie suas informações pessoais" },
  "/integracoes": { title: "Integrações", subtitle: "Conecte suas contas de marketplaces para sincronizar dados automaticamente" },
  "/mercado-livre": { title: "Mercado Livre — Vendas", subtitle: "Visão geral de vendas e métricas" },
  "/mercado-livre/estoque": { title: "Mercado Livre — Estoque", subtitle: "Gestão de estoque dos seus anúncios" },
  "/mercado-livre/produtos": { title: "Mercado Livre — Produtos", subtitle: "Catálogo de produtos e anúncios ativos" },
  "/mercado-livre/pedidos": { title: "Mercado Livre — Pedidos", subtitle: "Acompanhamento de pedidos e envios" },
  "/mercado-livre/anuncios": { title: "Mercado Livre — Anúncios", subtitle: "Gestão e performance dos anúncios" },
};

export function getRouteMeta(pathname: string) {
  return routeTitles[pathname] ?? { title: "Dashboard", subtitle: "" };
}
