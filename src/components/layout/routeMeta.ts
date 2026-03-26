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
  "/mercado-livre": { title: "Mercado Livre — Vendas", subtitle: "Visão geral de vendas e métricas" },
  "/mercado-livre/estoque": { title: "Mercado Livre — Estoque", subtitle: "Gestão de estoque dos seus anúncios" },
  "/mercado-livre/produtos": { title: "Mercado Livre — Anúncios", subtitle: "Catálogo de produtos e anúncios ativos" },
  "/mercado-livre/pedidos": { title: "Mercado Livre — Pedidos", subtitle: "Acompanhamento de pedidos e envios" },
  "/mercado-livre/anuncios": { title: "Mercado Livre — Publicidade", subtitle: "Gestão e performance de publicidade" },
  "/mercado-livre/perfil": { title: "Perfil", subtitle: "Gerencie suas informações pessoais" },
};

export function getRouteMeta(pathname: string) {
  return routeTitles[pathname] ?? { title: "Dashboard", subtitle: "" };
}
