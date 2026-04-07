

## Reformulação da Aba Relatórios - Anúncios

### Objetivo
Separar Ranking e Vendas por Marca em sub-abas (TabsList interna), tornar ambos mais completos, e corrigir "Vendas por Marca" para usar o atributo `brand` real da API do ML (já disponível em `item.brand`) em vez de extrair a primeira palavra do título.

### Alterações

**1. Sub-abas na aba Relatórios**

Substituir o grid lado-a-lado por um `Tabs` interno com duas sub-abas: "Ranking" e "Por Marca", ocupando largura total.

**2. Ranking de Anúncios (mais completo)**

- Manter o `TopSellingProducts` mas adicionar colunas extras: preço unitário, estoque disponível, e % de participação na receita total.
- Mostrar todos os itens em tabela ao invés de apenas os top 10, com scroll.
- Incluir KPIs resumidos no topo: total de unidades vendidas, receita total gerada, ticket médio dos top sellers.

**3. Vendas por Marca (correção + enriquecimento)**

- Usar `item.brand` (atributo BRAND da API do ML) em vez de `extractBrand(title)` (primeira palavra do título).
- Itens sem marca ficam agrupados como "Sem marca".
- Adicionar colunas: quantidade de anúncios por marca, unidades vendidas, receita, ticket médio, e estoque total.
- Apresentar em formato tabela com barras de progresso na coluna de receita.
- Manter o filtro de marca existente no catálogo funcionando com o mesmo campo `brand`.

### Arquivo modificado

- `src/pages/mercadolivre/MLProdutos.tsx` — Refatorar a seção `TabsContent value="relatorios"`: adicionar sub-abas, enriquecer ranking com tabela completa, corrigir e enriquecer vendas por marca.

### Detalhes Técnicos

- Remover a função `extractBrand()` (não mais necessária).
- O `brandData` usará `item.brand || "Sem marca"` diretamente.
- Sub-tabs usarão o mesmo componente `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` já importado, com estilo `h-8` / `text-xs px-3 h-7` consistente.
- Ranking em formato `Table` com colunas: #, Anúncio (thumb+título), Preço, Vendidos, Receita, Estoque, % Part.
- Marca em formato `Table` com colunas: Marca, Anúncios, Vendidos, Receita (com barra), TM, Estoque.

