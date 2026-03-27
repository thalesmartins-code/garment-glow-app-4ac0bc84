

## Tabelas Venda por Hora — 4 em linha

Alterar o grid das tabelas de `grid-cols-1 lg:grid-cols-2` para `grid-cols-1 md:grid-cols-2 xl:grid-cols-4` quando "Todos" estiver selecionado, colocando as 4 tabelas na mesma linha em telas largas.

### Mudanças

**`src/pages/MercadoLivre.tsx`**
- Linha ~1174: trocar `grid-cols-1 lg:grid-cols-2 gap-4` por `grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3` no grid das tabelas hourly
- Opcionalmente fazer o mesmo para os gráficos hourly (linha ~1004) se desejado

**`src/components/mercadolivre/HourlySalesTable.tsx`**
- Reduzir font-size e padding no modo `compact` para caber em 1/4 da tela (ex: `text-xs`, `px-1.5`, `py-1`)

