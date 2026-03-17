
Objetivo

Melhorar o gráfico de “Vendas Diárias” na página Mercado Livre para incluir um modo “Venda/Hora”. Pelo que você definiu, esse modo deve:
- aparecer para Hoje e 7 dias
- exibir ambos: valor vendido e quantidade de pedidos
- relacionar as vendas com a hora do dia

Leitura do que existe hoje

- A página `src/pages/MercadoLivre.tsx` carrega e exibe apenas dados diários (`allDaily` / `daily`).
- O gráfico atual é um `AreaChart` com duas séries:
  - Venda Total
  - Venda Aprovada
- A Edge Function `supabase/functions/mercado-libre-integration/index.ts` agrega só por dia e persiste apenas em `ml_daily_cache`.
- Hoje não existe cache por hora, então o frontend não tem como montar essa visão sem uma nova fonte de dados.

Abordagem proposta

1. Adicionar cache horário no Supabase
- Criar uma nova tabela, por exemplo `ml_hourly_cache`, com colunas no padrão do cache diário:
  - `user_id`
  - `date`
  - `hour`
  - `total_revenue`
  - `approved_revenue`
  - `qty_orders`
  - `synced_at`
- Aplicar RLS igual ao padrão já usado em `ml_daily_cache`:
  - usuário vê/insere/atualiza/exclui apenas os próprios dados
- Garantir unicidade por `user_id + date + hour`

2. Estender a Edge Function para agregar por hora
- Reaproveitar os pedidos já buscados em `mercado-libre-integration`.
- Durante a agregação, montar também um mapa horário com:
  - valor total vendido por hora
  - valor aprovado por hora
  - quantidade de pedidos por hora
- Persistir esse agregado em `ml_hourly_cache`.
- Incluir `hourly_breakdown` na resposta da function, além do `daily_breakdown`.

3. Tratar corretamente o horário
- Para evitar distorção de fuso, o bucket por hora deve ser derivado de `order.date_created` preservando a hora do próprio timestamp retornado pelo Mercado Livre.
- Isso evita deslocamentos de hora por conversão UTC/local do navegador.

4. Atualizar o fluxo de sincronização no frontend
- Em `MercadoLivre.tsx`, além do cache diário, carregar dados horários quando o modo “Venda/Hora” estiver ativo.
- Não carregar histórico horário completo sem necessidade:
  - Hoje: buscar somente o dia atual
  - 7 dias: buscar apenas os últimos 7 dias
- Isso evita excesso de linhas e risco de limite de consulta.
- Em `HistoricalSyncModal.tsx`, salvar também o `hourly_breakdown` quando a importação histórica retornar esses dados.

5. Trocar o gráfico por uma visualização que suporte 2 métricas
- Substituir o `AreaChart` atual por um `ComposedChart` no bloco do gráfico do Mercado Livre.
- No modo diário:
  - manter a experiência atual, com receita como destaque
- No modo “Venda/Hora”:
  - eixo X: horas do dia (`00h` a `23h`)
  - série de receita: linha/área
  - série de pedidos: barras ou linha secundária
  - usar dois eixos Y:
    - um para moeda
    - um para quantidade de pedidos

Comportamento da nova opção

- Adicionar um controle no cabeçalho do card do gráfico:
  - `Diário`
  - `Venda/Hora`
- Regras:
  - Hoje: “Venda/Hora” disponível
  - 7 dias: “Venda/Hora” disponível
  - períodos maiores/customizados: desabilitar ou esconder a opção e manter gráfico diário
- Para 7 dias, a leitura mais útil é:
  - agregar por faixa horária somando todos os dias do período
  - exemplo: todas as vendas feitas às 10h nos últimos 7 dias entram no bucket `10h`
- Isso mantém o eixo limpo e realmente mostra a “relação entre vendas e hora”.

UX prevista

- Título dinâmico:
  - `Vendas Diárias — Hoje`
  - `Venda por Hora — Hoje`
  - `Venda por Hora — Últimos 7 dias`
- Tooltip adaptado:
  - em modo horário, mostrar hora + receita + pedidos
- Legenda clara:
  - `Venda Total`
  - `Venda Aprovada`
  - `Pedidos`
- Se não houver cache horário ainda:
  - mostrar estado vazio orientando a sincronizar novamente

Arquivos que provavelmente serão envolvidos

- `src/pages/MercadoLivre.tsx`
- `src/components/mercadolivre/HistoricalSyncModal.tsx`
- `supabase/functions/mercado-libre-integration/index.ts`
- `supabase/migrations/...` para criar `ml_hourly_cache` e políticas RLS

Detalhes técnicos importantes

- Não faz sentido tentar montar “Venda/Hora” só no frontend com o estado atual, porque os dados armazenados hoje são apenas diários.
- A solução mais sólida é persistir agregado horário no backend no mesmo momento em que os pedidos já são processados.
- Para o período de 7 dias, agregar por “hora do dia” é melhor do que usar um eixo com `data + hora`, que ficaria poluído e difícil de ler.
- Como o gráfico misturará moeda e quantidade, `ComposedChart` com eixo duplo é a opção mais adequada.

Plano de implementação

1. Criar a tabela `ml_hourly_cache` com RLS e chave única por usuário/data/hora.
2. Atualizar `mercado-libre-integration` para:
   - agregar por dia e por hora
   - persistir os dois caches
   - retornar `hourly_breakdown`
3. Atualizar o fallback de cache do frontend para suportar os dados horários.
4. Adicionar o toggle `Diário / Venda-Hora` no card do gráfico.
5. Trocar o gráfico atual por um `ComposedChart` com modo diário e modo horário.
6. Restringir o modo horário para Hoje e 7 dias.
7. Ajustar tooltip, legenda, título e empty states.
8. Validar manualmente os cenários:
   - Hoje em modo diário
   - Hoje em modo horário
   - 7 dias em modo diário
   - 7 dias em modo horário
   - período maior que 7 dias com modo horário indisponível

Resultado esperado

Você terá o mesmo dashboard atual, mas com uma leitura adicional muito mais útil para operação: identificar em quais horas do dia o Mercado Livre vende mais, tanto em faturamento quanto em número de pedidos, para Hoje e para os últimos 7 dias.
