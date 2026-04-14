

## Melhorias visuais no Modo TV de Vendas

### Objetivo
Alinhar visualmente o Modo TV (`/api/tv`) com o dashboard de vendas principal (`/api`), melhorando os cards de "Receita por Hora" e "Top Anúncios".

### Alterações em `src/pages/TVModeVendas.tsx`

**1. KPI Cards — usar variante `minimal` (como no dashboard de vendas)**
- Trocar `variant` de `purple`/`info`/`orange`/`neutral` para `minimal` em todos os 5 cards, mantendo `size="compact"`.

**2. Card "Receita por Hora" — usar Card component + gradient fill**
- Envolver com `<Card>` + `<CardContent>` em vez de `div` com classes manuais.
- Título com `text-sm font-medium text-foreground` (sem `text-muted-foreground`).
- Adicionar `linearGradient` no fill da Area (como o dashboard usa `url(#mlTotal)`).
- Bars com `radius={[6,6,0,0]}` e `maxBarSize={24}` (consistente com vendas).
- Tooltip com `borderRadius: 12` e `boxShadow`.
- XAxis interval de 2 (a cada 3h).

**3. Card "Top Anúncios" — tabela estruturada com 8 produtos**
- Envolver com `<Card>` + `<CardContent>`.
- Aumentar slice de 5 para 8 produtos.
- Substituir o layout atual (inline com progress bar) pelo formato tabular do dashboard de vendas:
  - Header row com colunas: #, thumb, Produto, Vendidos, Receita, % Part.
  - Medalhas (🥇🥈🥉) nos top 3.
  - Valores de "Vendidos" e "Receita" com `font-semibold` para destaque.
  - Linhas separadas por `border-b border-border/30`.
- Remover mini progress bars (não existem no dashboard principal).

### Arquivo afetado
- `src/pages/TVModeVendas.tsx` — único arquivo editado.

