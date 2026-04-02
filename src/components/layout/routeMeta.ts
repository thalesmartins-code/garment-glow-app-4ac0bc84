export const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/sheets": { title: "Dashboard", subtitle: "Monitoramento de performance por marketplace" },
  "/sheets/vendas-diarias": { title: "Vendas", subtitle: "Acompanhe o desempenho diário de vendas" },
  "/sheets/importacao": { title: "Importação", subtitle: "Importe dados de vendas via CSV ou Excel" },
  "/sheets/configuracoes": { title: "Configurações", subtitle: "Configure metas e distribuição de PMT" },
  "/sheets/sellers": { title: "Sellers", subtitle: "Gerencie sellers e marketplaces ativos" },
  "/sheets/usuarios": { title: "Usuários", subtitle: "Gerencie usuários e permissões do sistema" },
  "/perfil": { title: "Perfil", subtitle: "Gerencie suas informações pessoais" },
  "/sheets/integracoes": {
    title: "Integrações",
    subtitle: "Conecte suas contas de marketplaces para sincronizar dados automaticamente",
  },
  "/api": { title: "Vendas", subtitle: "Visão geral de vendas e métricas" },
  "/api/estoque": { title: "Estoque", subtitle: "Gestão de estoque dos seus anúncios" },
  "/api/produtos": { title: "Anúncios", subtitle: "Catálogo de produtos e anúncios ativos" },
  "/api/pedidos": { title: "Pedidos", subtitle: "Acompanhamento de pedidos e envios" },
  "/api/anuncios": { title: "Publicidade", subtitle: "Gestão e performance de publicidade" },
  "/api/financeiro": { title: "Financeiro", subtitle: "Análise de taxas, comissões e custo de frete" },
  "/api/perfil": { title: "Perfil", subtitle: "Gerencie suas informações pessoais" },
  "/api/sellers": { title: "Sellers", subtitle: "Gerencie sellers e marketplaces ativos" },
  "/api/integracoes": {
    title: "Integrações",
    subtitle: "Conecte suas contas de marketplaces para sincronizar dados automaticamente",
  },
  "/api/importacao": { title: "Importação", subtitle: "Importe dados de vendas dos marketplaces" },
  "/api/sincronizacoes": { title: "Sincronizações", subtitle: "Histórico e logs de sincronização" },
};

export function getRouteMeta(pathname: string) {
  return routeTitles[pathname] ?? { title: "Dashboard", subtitle: "" };
}
