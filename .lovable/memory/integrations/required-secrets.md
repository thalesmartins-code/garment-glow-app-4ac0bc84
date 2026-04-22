---
name: Required Integration Secrets (API mode)
description: Lista oficial de secrets necessários no modo 100% API. Google Sheets foi removido — não recriar GOOGLE_*.
type: reference
---
O app opera em modo 100% API (ambiente `/sheets` removido). A integração via Google Sheets foi descontinuada e todos os secrets `GOOGLE_*` (`GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`) foram removidos. Não recriar.

## Secrets atuais necessários

**Plataforma (auto-gerenciados pelo Lovable/Supabase, não editar manualmente):**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- `LOVABLE_API_KEY` (rotacionar via `ai_gateway--rotate_lovable_api_key`)

**Mercado Livre (OAuth + Edge Functions `ml-*` e `mercado-libre-integration`):**
- `ML_APP_ID`
- `ML_CLIENT_SECRET`

**Magalu (Edge Function `magalu-integration`, OAuth2 PKCE):**
- `MAGALU_CLIENT_ID`
- `MAGALU_CLIENT_SECRET`
- `MAGALU_API_KEY`
- `MAGALU_API_KEY_ID`
- `MAGALU_API_KEY_SECRET`

## Regras
- Nenhum secret deve ser exposto no frontend ou em estado React/localStorage.
- Edge Functions consomem secrets via `Deno.env.get(...)`.
- Antes de adicionar qualquer novo secret, conferir se a Edge Function correspondente realmente o referencia.