

# Cache de Dados do Mercado Livre no Supabase

## Problema
Toda vez que o dashboard carrega ou muda o filtro, a edge function busca todos os pedidos da API do ML do zero -- lento e desnecessario para dados historicos que nao mudam.

## Solucao: Tabela de cache com TTL

### 1. Nova tabela `ml_daily_cache`

Armazena o resumo diario ja agregado. A edge function salva os dados apos buscar da API, e o frontend primeiro tenta ler do cache.

```text
ml_daily_cache
├── id (uuid, PK)
├── user_id (uuid, FK auth.users)
├── date (date)
├── total_revenue (numeric)
├── approved_revenue (numeric)
├── qty_orders (integer)
├── cancelled_orders (integer)
├── shipped_orders (integer)
├── synced_at (timestamptz)  -- quando foi atualizado
└── UNIQUE(user_id, date)
```

Tambem uma tabela para dados do usuario ML e listings:

```text
ml_user_cache
├── user_id (uuid, PK)
├── ml_user_id (integer)
├── nickname (text)
├── country (text)
├── permalink (text)
├── active_listings (integer)
├── synced_at (timestamptz)
```

### 2. Fluxo do Frontend (MercadoLivre.tsx)

```text
Abrir pagina
  ├─ 1. SELECT do ml_daily_cache + ml_user_cache (instantaneo)
  │     └─ Se tem dados e synced_at < 1h atras → exibe direto, sem chamar API
  │
  ├─ 2. Se cache vazio ou expirado → chama edge function (como hoje)
  │
  └─ 3. Botao "Sincronizar" → sempre force_refresh=true → chama API e atualiza cache
```

- Ao mudar filtro de periodo: apenas re-filtra os dados do cache localmente (ja temos dados diarios). So chama API se faltam dias no cache.

### 3. Edge Function atualizada

- Recebe param opcional `force_refresh`
- Apos buscar da API, faz UPSERT no `ml_daily_cache` e `ml_user_cache`
- Retorna os dados normalmente

### 4. RLS

- SELECT/INSERT/UPDATE/DELETE restritos ao proprio user (`user_id = auth.uid()`)

### 5. Mudancas no Frontend

- `fetchData` primeiro tenta ler do Supabase
- Se cache valido (< 1h), renderiza imediatamente
- Se cache expirado ou forcado, chama a edge function que atualiza o cache
- Mudar periodo (7/15/30) filtra dados do cache localmente sem nova requisicao

### Resultado esperado
- Primeira visita apos sync: carregamento instantaneo do banco
- Troca de filtro: instantanea (filtra localmente)
- Sync manual: atualiza cache e exibe dados novos

