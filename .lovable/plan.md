
Objetivo: refazer o filtro do header do zero para que seller e loja sejam a única fonte de verdade nas páginas Vendas, Estoque e Anúncios, sem reaproveitar estados ambíguos da implementação atual.

Diagnóstico do problema atual:
- Hoje existem estados sobrepostos e conflitantes: `SellerContext` (`selectedSeller`, `selectedStoreIds`, `selectedMarketplace`) e `MLStoreContext` (`selectedStore`, `stores`, cache de vendas).
- O header usa seleção por chips/multi-seleção, mas as páginas ML consomem estados diferentes e caches locais próprios.
- O valor “all” ficou ambíguo: em vários pontos ele vira “somar tudo que eu tiver”, inclusive preservando dados antigos.
- Vendas, Estoque e Anúncios mantêm dados/caches locais que não são limpos corretamente quando o seller/loja muda.
- Resultado: ao trocar para um seller sem integração, os dados antigos continuam na tela; ao trocar loja, os cards/tabelas seguem agregados.

Refatoração proposta:
1. Criar um novo modelo único de filtro global
- Substituir a lógica atual por um contexto novo, por exemplo `HeaderScopeContext`/`GlobalSellerScope`.
- Esse contexto terá somente:
  - `selectedSellerId`
  - `selectedStoreId` (`"all"` ou `seller_stores.id`)
  - `resolvedMLUserIds`
  - `scopeKey` único (`sellerId + storeId + mlIds`)
  - flags como `hasMLConnection` e `isMapped`
- Regra principal:
  - Seller selecionado + “Todas as lojas” = agregar somente as lojas daquele seller.
  - Seller selecionado + loja específica = trazer somente aquela loja.
  - Seller sem integração ML = estado vazio/não conectado, nunca reaproveitar dados anteriores.

2. Apagar o filtro atual e recriar a UI do header de forma simples
- Remover o fluxo atual baseado em chips/multi-seleção para essas páginas ML.
- Criar um seletor de 2 níveis no header:
  - Select 1: Seller
  - Select 2: Loja
- O seletor de loja será sempre single-select:
  - “Todas as lojas”
  - “Meli SP”
  - “Meli RJ”
  - etc.
- Isso elimina a ambiguidade do multi-select e deixa o comportamento previsível.

3. Separar seleção de visualização de conexão ML
- `SellerContext` pode continuar existindo para cadastro/listagem de sellers/lojas.
- Mas Vendas, Estoque e Anúncios deixarão de depender de `selectedStoreIds` e `selectedMarketplace` como fonte principal.
- `MLStoreContext` deve ser simplificado:
  - ou deixa de controlar seleção
  - ou passa a ser apenas provider de conexões/tokens/cache bruto
- A seleção efetiva passa a vir só do novo contexto global.

4. Resolver o mapeamento seller_store -> conta ML de forma explícita
- Usar `seller_stores.external_id` ↔ `ml_tokens.ml_user_id` como vínculo oficial.
- Se uma loja não tiver vínculo válido:
  - não cair em “all”
  - não mostrar dados de outra loja
  - mostrar estado “Loja sem vínculo com conta do Mercado Livre”.
- Isso evita exatamente o caso “BuyClock sem integração exibindo Sandrini”.

5. Refatorar Vendas para usar somente o novo escopo
- Remover dependências cruzadas de `selectedStoreIds`, `selectedMarketplace` e estado local herdado.
- Toda carga de dados deve ser orientada por `scopeKey`.
- Ao mudar `scopeKey`:
  - limpar imediatamente cards, tabelas e relatórios
  - invalidar refs/caches
  - refazer leitura do cache/backend apenas para o seller/loja atual
- “Todas as lojas” deve consultar só os `ml_user_id` resolvidos do seller atual.

6. Refatorar Estoque para usar o mesmo escopo
- `MLInventoryContext` deve parar de deduzir seleção por estado legado.
- Passará a receber `resolvedMLUserIds` do novo contexto.
- Ao mudar seller/loja:
  - limpar `items`, `summary`, `lastUpdated`
  - se não houver integração, renderizar vazio/não conectado
  - nunca manter inventário antigo na tela.

7. Refatorar Anúncios para usar o mesmo escopo
- `useMLAds` deve usar apenas os `resolvedMLUserIds` do novo contexto.
- O cache local do hook deve ser indexado por `scopeKey + período`.
- Ao trocar seller/loja:
  - limpar `realData`
  - recalcular `cacheKey`
  - se não houver conexão, voltar para estado vazio/não conectado
  - não reaproveitar campanhas/produtos do seller anterior.

8. Padronizar estados vazios
- Com seller sem integração:
  - Vendas: KPIs zerados ou estado “sem dados / sem integração”
  - Estoque: “Mercado Livre não conectado”
  - Anúncios: “Mercado Ads não disponível / conta não conectada”
- O comportamento deve ser consistente entre as 3 páginas.

Arquivos que provavelmente entram na refatoração:
- `src/components/layout/Header.tsx`
- `src/components/layout/SellerMarketplaceBar.tsx`
- `src/components/layout/StoreGroupSelector.tsx`
- novo contexto de escopo global
- `src/contexts/MLStoreContext.tsx`
- `src/pages/MercadoLivre.tsx`
- `src/contexts/MLInventoryContext.tsx`
- `src/hooks/useMLAds.ts`
- possivelmente `src/contexts/MarketplaceContext.tsx` para desacoplar lógica antiga dessas páginas ML

Resultado esperado:
- Selecionar “Sandrini + Meli SP” traz apenas SP.
- Selecionar “Sandrini + Todas as lojas” soma apenas as lojas da Sandrini.
- Selecionar “BuyClock + loja X” traz só a loja X, se houver vínculo.
- Selecionar “BuyClock” sem integração limpa a tela e mostra estado sem conexão.
- Vendas, Estoque e Anúncios passam a responder exatamente igual ao mesmo filtro global.

Validação que farei na implementação:
- Troca seller A -> seller B -> seller A
- Troca entre duas lojas do mesmo seller
- Seller sem integração
- Loja sem `external_id` válido
- Trocas rápidas para garantir que nenhum cache antigo volte para a tela
- Conferir cards, tabelas e relatórios nas 3 páginas

Detalhe técnico importante:
- Não pretendo corrigir em cima da lógica atual de multi-select.
- A melhor abordagem aqui é realmente apagar a camada de seleção antiga nessas páginas ML e reconstruir com um fluxo único, determinístico e sem fallback implícito para “all”.
