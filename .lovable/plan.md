

## Diagnóstico: Por que dados de dias anteriores desaparecem

### Causa raiz encontrada

A **API de visitas** retorna dados para datas **fora** do range do chunk. Os logs confirmam: `"daily visit rows: 3"` para um chunk de 1 dia.

No código da Edge Function (linhas 356-371), quando visits retorna uma data fora do chunk (ex: 03/25 no chunk de 03/26), ela **cria uma entrada diária vazia** para essa data com `total=0, qty=0` mas com visitas. Essa entrada é então salva via upsert, **sobrescrevendo** os dados reais desse dia que foram gravados pelo chunk correto anterior.

```text
Fluxo do bug:
1. Chunk 03/25 roda → grava 03/25 com receita R$50k ✓
2. Chunk 03/26 roda → visits API retorna dados de 03/25 e 03/26
   → Cria dailySales["2026-03-25"] = {total:0, visits:X}
   → Upsert SOBRESCREVE 03/25 com receita R$0 ✗
3. Resultado: dia 25 aparece zerado no gráfico
```

### Correção

**Edge Function** (`supabase/functions/mercado-libre-integration/index.ts`):
- Filtrar `dailyVisits` para incluir apenas datas dentro do range solicitado (`date_from` a `date_to`) antes de mesclar no `dailySales`
- Filtrar também os pedidos para garantir que apenas datas BRT dentro do range gerem entradas no `dailySales`
- Isso impede que o upsert sobrescreva dados de outros dias com valores zerados

Mudança concreta (linhas ~356-371): ao iterar `dailyVisits`, pular datas onde `date < date_from` ou `date > date_to`. Mesmo tratamento para pedidos com datas BRT fora do range.

### Arquivos afetados
- `supabase/functions/mercado-libre-integration/index.ts` — filtrar visits e orders por range antes de salvar

