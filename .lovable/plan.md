

## Plano: Criar página dedicada "Mercado Livre" com Dashboard completo

### Objetivo
Criar uma nova rota `/mercado-livre` no sidebar com uma página dedicada que exiba dashboards completos usando os dados da API do Mercado Livre (via edge function `mercado-libre-integration` já existente).

### O que será criado

**1. Nova página `src/pages/MercadoLivre.tsx`**
- Busca o token ML do banco (`ml_tokens`) ou localStorage
- Chama `mercado-libre-integration` para obter métricas e breakdown diário
- Exibe estado vazio caso não esteja conectado, com link para `/integracoes`

**2. KPIs (4 cards no topo)**
- Receita Total (últimos 30 dias)
- Receita Aprovada
- Total de Pedidos
- Ticket Médio
- Cada card usando o componente `KPICard` existente

**3. Gráfico de Vendas Diárias**
- Gráfico de área/linha usando Recharts (já instalado) com o `daily_breakdown` retornado pela API
- Eixo X: datas, Eixo Y: valor em R$
- Duas linhas: Venda Total e Venda Aprovada

**4. Cards adicionais**
- Anúncios Ativos
- Pedidos Enviados vs Cancelados
- Info do vendedor (nickname, link para perfil)

**5. Tabela de vendas diárias**
- Tabela com colunas: Data, Qtd Pedidos, Venda Total, Venda Aprovada
- Usando componente `Table` existente

**6. Integração no app**
- Adicionar rota `/mercado-livre` em `App.tsx` (protegida, dentro do AppLayout)
- Adicionar item no Sidebar com ícone dedicado
- Adicionar em `roleAccess.ts` (acessível a admin, editor, viewer)
- Botão de sincronizar (refresh) no header da página

### Arquivos modificados
- `src/pages/MercadoLivre.tsx` (novo)
- `src/App.tsx` — nova rota
- `src/components/layout/Sidebar.tsx` — novo nav item
- `src/config/roleAccess.ts` — permissão da rota

### Dependências
- Usa componentes existentes: `KPICard`, `Card`, `Table`, Recharts
- Usa edge function existente: `mercado-libre-integration`
- Token lido de `ml_tokens` (Supabase) com fallback localStorage

