

# Parser Nativo Shopee — Relatórios Diário e Mensal

## Análise dos Arquivos

Ambos os arquivos seguem o mesmo formato CSV com duas seções:

1. **Linha 1-2**: Resumo do período (cabeçalho + 1 linha agregada)
2. **Linha 3**: Vazia
3. **Linha 4+**: Dados detalhados (por hora no diário, por dia no mensal)

### Colunas relevantes (Produto Pago)
| Coluna CSV | Campo interno | Tipo |
|---|---|---|
| Data | date | string (dd/mm/yyyy ou dd/mm/yyyy HH:mm) |
| Vendas (BRL) | revenue | number (formato BR: 10.227,04) |
| Vendas Sem os Descontos da Shopee | revenue_without_discounts | number |
| Pedidos | orders | number |
| Vendas por Pedido | avg_order_value | number |
| Cliques Por Produto | clicks | number |
| Visitantes | visitors | number |
| Taxa de Conversão de Pedidos | conversion_rate | percent string |
| Pedidos Cancelados | cancelled_orders | number |
| Vendas Canceladas | cancelled_revenue | number |
| Pedidos Devolvidos / Reembolsados | returned_orders | number |
| Vendas Devolvidas / Reembolsadas | returned_revenue | number |
| # de compradores | buyers | number |
| # de novos compradores | new_buyers | number |
| # de compradores existentes | existing_buyers | number |
| # de compradores em potencial | potential_buyers | number |
| Repetir Índice de Compras | repeat_purchase_rate | percent string |

### Detecção automática do tipo
- Se a coluna Data contém hora (HH:mm) → relatório diário/horário
- Se a coluna Data contém apenas dd/mm/yyyy → relatório mensal/diário

## Etapas

### 1. Criar tabela `shopee_sales` no Supabase
Colunas baseadas nos campos acima, com `user_id`, `date`, `hour` (nullable para mensal), e todas as métricas. Unique constraint em `(user_id, date, hour)` para permitir upserts. RLS por `user_id = auth.uid()`.

### 2. Atualizar parser em `marketplaceParsers.ts`
Implementar `parseShopeeFile()` que:
- Pula a seção de resumo (linhas 1-3)
- Lê os dados detalhados a partir da linha 4
- Converte números BR (1.234,56 → 1234.56)
- Converte percentuais (4,57% → 0.0457)
- Detecta se é horário ou diário pela presença de hora na data
- Retorna array normalizado de `ParsedImportRow`

### 3. Atualizar `MLImportacao.tsx`
- Adicionar colunas extras no preview (visitantes, conversão, cancelados)
- Conectar botão "Importar" ao Supabase (upsert na `shopee_sales`)

### 4. Tabelas Amazon e Magalu
Ficam pendentes até receber os arquivos de exemplo dessas plataformas.

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/migrations/` | Criar — tabela `shopee_sales` |
| `src/utils/marketplaceParsers.ts` | Editar — parser nativo Shopee |
| `src/pages/mercadolivre/MLImportacao.tsx` | Editar — preview + upsert |

