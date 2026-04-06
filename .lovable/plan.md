## Plano: Integrar card de Publicidade com API real do ML Ads

### 1. Criar Edge Function `ml-ads` (`supabase/functions/ml-ads/index.ts`)
- Recebe `ml_user_id` e `date_from`/`date_to` via query params
- Busca token de acesso na tabela `ml_tokens`
- Chama endpoints da API do ML Ads:
  - `GET /advertising/advertisers/{user_id}` — verifica se o vendedor tem conta de anúncios
  - `GET /advertising/campaigns/{user_id}` — lista campanhas com status, budget, métricas
  - `GET /advertising/product_ads/search?user_id={id}` — anúncios de produtos ativos
  - `GET /advertising/product_ads/metrics/report?user_id={id}&date_from=...&date_to=...` — métricas diárias (impressões, cliques, gasto, receita atribuída)
- Retorna JSON com `{ campaigns, daily, products, summary }`
- Inclui CORS, validação de JWT e tratamento de erros

### 2. Atualizar config (`supabase/config.toml`)
- Adicionar entrada `[functions.ml-ads]` com `verify_jwt = false`

### 3. Atualizar hook `useMLAds` (`src/hooks/useMLAds.ts`)
- Tentar buscar dados reais via `supabase.functions.invoke("ml-ads", ...)`
- Se falhar ou se não houver loja conectada, usar mock data como fallback
- Definir `isRealData = true` quando usando dados reais
- Badge "Dados simulados" já existe e reagirá automaticamente ao flag

### Arquivos criados/editados
- **Novo:** `supabase/functions/ml-ads/index.ts`
- **Editado:** `supabase/config.toml`
- **Editado:** `src/hooks/useMLAds.ts`
