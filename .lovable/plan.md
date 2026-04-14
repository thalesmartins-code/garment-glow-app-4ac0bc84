

## Plano de Responsividade — Ambiente /api

### Visao Geral

Tornar todas as paginas do ambiente `/api` funcionais e visualmente agradaveis em **tablet** (768-1024px) e **mobile** (<768px). O projeto ja usa Tailwind CSS com breakpoints responsivos em alguns pontos, mas a sidebar fixa e o header largo impedem o uso em telas menores.

---

### 1. Sidebar: Drawer mobile com Sheet

**Problema**: A `EnvironmentSidebar` e fixa com `w-56` / `w-20`, ocupando espaco permanente em telas pequenas.

**Solucao**:
- Em telas `< md` (768px), esconder a sidebar fixa e renderizar um botao hamburger no Header
- Ao clicar, abrir a sidebar dentro de um `Sheet` (ja existe no projeto) deslizando da esquerda
- Ao navegar (clicar em um link), fechar o Sheet automaticamente
- Em tablet (md-lg), manter a sidebar colapsada (modo `w-20`) por padrao

**Arquivos**: `LayoutShell.tsx`, `EnvironmentSidebar.tsx`

---

### 2. Header: Layout compacto para mobile

**Problema**: O header usa `px-8` fixo, exibe seller switcher + notificacoes + avatar lado a lado, transborda em telas pequenas.

**Solucao**:
- Reduzir padding para `px-4` em mobile (`px-4 md:px-8`)
- Esconder nome do usuario e label de role em mobile (ja parcialmente feito com `sm:block`)
- Adicionar botao hamburger (`Menu` icon) a esquerda em mobile
- Na `SellerMarketplaceBar`, reduzir `min-w` do nome do seller para caber em telas menores
- Esconder texto do botao de notificacao, manter so icone

**Arquivos**: `Header.tsx`, `SellerMarketplaceBar.tsx`

---

### 3. Area de conteudo principal: Padding responsivo

**Problema**: O `<main>` tem `p-8` fixo, desperdicando espaco em mobile.

**Solucao**: Alterar para `p-4 md:p-6 lg:p-8` no `LayoutShell.tsx`.

**Arquivo**: `LayoutShell.tsx`

---

### 4. Dashboard principal (`MercadoLivre.tsx`)

**Problema**: Grids de KPIs usam `grid-cols-3 lg:grid-cols-5`, nao colapsam bem em mobile.

**Solucao**:
- KPIs: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
- Seção de graficos horarios + metas: `grid-cols-1` em mobile (ja ok), garantir que o card de metas nao fique com largura fixa
- Seção custos + top anuncios: ajustar `md:grid-cols-6` para empilhar em mobile

---

### 5. Paginas internas do /api

Aplicar ajustes de grid consistentes nas subpaginas:

| Pagina | Ajuste |
|--------|--------|
| `MLProdutos.tsx` | Tabelas com `overflow-x-auto`, KPIs `grid-cols-2 sm:grid-cols-3` |
| `MLEstoque.tsx` | KPIs ja parcialmente responsivos, ajustar `grid-cols-3 lg:grid-cols-6` para `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` |
| `MLPedidos.tsx` | Tabela com scroll horizontal, filtros empilhados em mobile |
| `MLAnuncios.tsx` | Cards/tabela com scroll horizontal |
| `MLFinanceiro.tsx` | Grids de metricas empilhados |
| `MLDevolucoes.tsx` | Layout de cards empilhado |
| `MLPerguntas.tsx` | Lista de mensagens responsiva |
| `MLReputacao.tsx` | Cards de metricas `grid-cols-2` em mobile |
| `MLMetas.tsx` | Formularios full-width em mobile |
| `MLRelatorios.tsx` | Graficos full-width, tabelas com scroll |

---

### 6. Tabelas: Scroll horizontal

**Problema**: Tabelas com muitas colunas transbordam em mobile.

**Solucao**: Envolver todas as `<Table>` em `<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">` para permitir scroll horizontal em mobile sem quebrar o layout.

---

### Resumo de arquivos a editar

1. `src/components/layout/LayoutShell.tsx` — sidebar condicional + padding responsivo
2. `src/components/layout/EnvironmentSidebar.tsx` — aceitar prop `open/onClose` para modo drawer
3. `src/components/layout/Header.tsx` — botao hamburger + padding responsivo
4. `src/components/layout/SellerMarketplaceBar.tsx` — larguras minimas menores
5. `src/pages/MercadoLivre.tsx` — grids responsivos
6. `src/pages/mercadolivre/MLProdutos.tsx` — grids + tabelas responsivas
7. `src/pages/mercadolivre/MLEstoque.tsx` — grids responsivos
8. `src/pages/mercadolivre/MLPedidos.tsx` — tabela + filtros responsivos
9. `src/pages/mercadolivre/MLAnuncios.tsx` — layout responsivo
10. `src/pages/mercadolivre/MLFinanceiro.tsx` — grids responsivos
11. `src/pages/mercadolivre/MLDevolucoes.tsx` — layout responsivo
12. `src/pages/mercadolivre/MLPerguntas.tsx` — layout responsivo
13. `src/pages/mercadolivre/MLReputacao.tsx` — grids responsivos
14. `src/pages/mercadolivre/MLMetas.tsx` — formularios responsivos
15. `src/pages/mercadolivre/MLRelatorios.tsx` — graficos + tabelas responsivos

### Detalhes tecnicos

- Usar o hook `useIsMobile()` ja existente para controlar a sidebar em drawer
- Utilizar o componente `Sheet` (side="left") ja disponivel para o drawer mobile
- Breakpoints Tailwind: `sm` (640px), `md` (768px), `lg` (1024px)
- Nenhuma dependencia nova necessaria

