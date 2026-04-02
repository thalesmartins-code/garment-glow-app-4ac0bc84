

## Plano: Card de Metas ao lado do gráfico Venda / Hora

### O que será feito

Criar um componente `GoalsCard` com dados simulados de metas mensais e posicioná-lo ao lado do gráfico de Venda / Hora, formando um layout em grid (gráfico ocupa ~70%, card de metas ~30%).

### Componente `GoalsCard`

Novo arquivo `src/components/mercadolivre/GoalsCard.tsx` com dados mock:
- **Meta mensal de receita**: R$ 150.000 (progresso baseado no acumulado)
- **Meta de pedidos**: 500 pedidos/mês
- **Meta de ticket médio**: R$ 300
- **Meta de conversão**: 5%

Cada meta exibirá: título, valor atual vs valor alvo, barra de progresso e percentual atingido. Usa o mesmo estilo visual dos cards existentes (Card/CardContent do shadcn).

### Layout em `MercadoLivre.tsx`

O bloco do gráfico (linhas ~1372-1485) será envolvido em um `div` com grid `grid-cols-1 lg:grid-cols-[1fr_320px]`, colocando o gráfico à esquerda e o `GoalsCard` à direita. Isso se aplica tanto à visão "Todos os Marketplaces" quanto à visão individual.

### Dados mock do GoalsCard

O componente receberá `currentRevenue`, `currentOrders`, `currentTicket`, `currentConversion` como props (vindos dos `effectiveMetrics` já calculados) para exibir o progresso real contra as metas simuladas.

### Detalhes técnicos

- **Arquivo novo**: `src/components/mercadolivre/GoalsCard.tsx`
- **Arquivo editado**: `src/pages/MercadoLivre.tsx` — import do GoalsCard, wrapping do gráfico em grid com o card ao lado
- Barras de progresso usarão cores condicionais (verde ≥80%, amarelo ≥50%, vermelho <50%)

