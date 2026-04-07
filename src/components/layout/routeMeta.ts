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
  "/api/importacao": { title: "Importação", subtitle: "Importe dados de vendas dos marketplaces" },
  "/api/sincronizacoes": { title: "Sincronizações", subtitle: "Histórico e logs de sincronização" },
  "/api/metas": { title: "Metas", subtitle: "Defina metas mensais por loja e acompanhe no card de Vendas" },
  "/api/vendas-hora": { title: "Venda / Hora", subtitle: "Análise de vendas por hora do dia" },
  "/api/relatorios": { title: "Relatórios", subtitle: "Ferramentas de análise estratégica e comparativos" },
};

export function getRouteMeta(pathname: string) {
  return routeTitles[pathname] ?? { title: "Dashboard", subtitle: "" };
}
