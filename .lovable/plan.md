

## Plano: Corrigir filtro de lojas — mapear external_id e ajustar reatividade

### Causa Raiz

A tabela `seller_stores` tem `external_id = NULL` em todas as linhas. O `HeaderScopeContext` tenta cruzar `seller_stores.external_id` com `ml_tokens.ml_user_id` para resolver qual conta ML corresponde a qual loja — mas como `external_id` é sempre NULL, o filtro nunca funciona:

- Loja específica selecionada → `resolvedMLUserIds = []` → "não conectado"
- "Todas" selecionada → retorna todos os tokens do seller → sempre soma tudo
- BuyClock → sem tokens → correto (mas Vendas mostra mensagem errada por timing)

### Dados atuais no banco

| seller_stores.id | store_name | seller (via seller_id) | external_id |
|---|---|---|---|
| d450e03b... | Mercado Livre SP | Sandrini | NULL |
| 9eee89c9... | Mercado Livre MG | Sandrini | NULL |
| 78ba32c6... | Mercado Livre SP | BuyClock | NULL |
| 16ec4983... | Mercado Livre MG | BuyClock | NULL |

| ml_tokens.ml_user_id | seller (via seller_id) |
|---|---|
| 427063369 | Sandrini |
| 1421067331 | Sandrini |

### Solução em 2 partes

#### Parte 1: Migration — Preencher external_id

Criar uma migration SQL para atualizar os `external_id` das lojas da Sandrini vinculando cada loja a uma conta ML. O usuário precisará confirmar qual `ml_user_id` corresponde a qual loja (SP ou MG).

Proposta (assumindo ordem):
- Sandrini "Mercado Livre SP" (`d450e03b`) → `external_id = '427063369'`
- Sandrini "Mercado Livre MG" (`9eee89c9`) → `external_id = '1421067331'`

As lojas do BuyClock ficam sem `external_id` (não possuem integração ML).

#### Parte 2: Código — Corrigir timing e reatividade

1. **`HeaderScopeContext.tsx`**: Nenhuma mudança necessária — a lógica de resolução já está correta, só faltavam os dados no banco.

2. **`MLStoreContext.tsx`**: Ajustar para que o `loading` inicial não cause flash de "não conectado". Garantir que `stores` esteja populado antes que `MercadoLivre.tsx` execute o efeito de init.

3. **`MercadoLivre.tsx`**: O efeito de init (linha 776) roda quando `cacheLoadedRef` é false. Após reset por `scopeKey` (linha 762), ele roda novamente — mas pode rodar antes de `stores` estar populado. Ajustar para aguardar `loading === false` antes de decidir se está conectado ou não.

4. **`MLInventoryContext.tsx`**: O `getTokensToFetch` já usa `selectedStore` derivado do scope. Como `selectedStore` agora será corretamente resolvido (porque `external_id` estará preenchido), a filtragem individual passará a funcionar.

5. **`useMLAds.ts`**: Mesmo caso — usa `selectedStore` e `stores` do MLStoreContext. Funcionará automaticamente.

### Arquivos a modificar
- Nova migration SQL (preencher `external_id`)
- `src/pages/MercadoLivre.tsx` — aguardar loading antes de decidir conexão
- `src/contexts/MLStoreContext.tsx` — pequeno ajuste de timing

### Pergunta ao usuário
Preciso confirmar: qual `ml_user_id` corresponde a qual loja?
- `427063369` = Mercado Livre SP ou MG?
- `1421067331` = Mercado Livre SP ou MG?

Isso pode ser verificado acessando a página de integrações ou checando o nickname de cada conta no Mercado Livre.

