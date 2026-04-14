

## Analise Completa: Seguranca, Desempenho, Engenharia e Escalabilidade

### Estado Atual do Projeto

- **3 usuarios** ativos, **4 contas ML** conectadas
- **Banco de dados**: ~8 MB total, maior tabela `ml_product_daily_cache` com 12.6k rows (6 MB)
- **Indices compostos**: ja implementados em todas as tabelas de cache (correto)
- **Edge Functions**: 13 funcoes, JWT validado internamente, Zod em 5 funcoes
- **Code splitting**: lazy loading em 13 sub-rotas ML (correto)
- **QueryClient**: React Query usado em todas as queries ML

---

### PLANO DE ACAO — Status das 5 Fases

#### ✅ Fase 1: Seguranca Critica — CONCLUIDA
1. ✅ **access_token removido do frontend**: `MLStoreContext`, `HeaderScopeContext`, `TVModeVendas`, `Integrations.tsx` limpos
2. ✅ **Tokens removidos do localStorage** (ML): apenas session do Supabase Auth
3. ✅ **RLS restritivo no audit_log**: INSERT/UPDATE/DELETE bloqueados
4. ✅ **RLS corrigido em sales_data**: editors restritos aos proprios sellers
5. ⏳ **Leaked Password Protection**: requer acao manual no dashboard Supabase

#### ✅ Fase 2: React Query — CONCLUIDA
6. ✅ **useMLQueries.ts criado**: 4 hooks (daily, hourly, products, user)
7. ✅ **MercadoLivre.tsx consome React Query diretamente**
8. ✅ **useMLDataLoader.ts deletado** — codigo morto removido
9. ✅ **useMLSync usa invalidacao automatica** via `useInvalidateMLQueries`

#### ✅ Fase 3: Escalabilidade Backend — CONCLUIDA
10. ✅ **Edge Function ml-products-aggregated**: agregacao server-side com Zod + paginacao
11. ✅ **Cooldown de sync (30s)** em `useMLSync`
12. ⏳ **Otimizar ml-inventory**: pendente (paginar em chunks, cache de items)

#### ✅ Fase 4: Robustez — CONCLUIDA
13. ✅ **Error Boundaries**: todas as 13 sub-rotas ML protegidas
14. ✅ **Tipos unificados**: `src/types/mlCache.ts` como single source of truth
15. ✅ **`as any` limpo**: removido de `SettingsContext`, `Integrations`, `HistoricalSyncModal`, `MercadoLivre`
    - `SettingsContext`: `ml_targets` nao esta nos types gerados — `as any` contido em helper `mlTargetsTable()`
    - `HistoricalSyncModal`: `ml_sync_log` upsert com onConflict customizado — `as any` necessario apenas no cast do builder
16. ⚠️ **verify_jwt**: mantido `false` conforme arquitetura Lovable (validacao JWT in-code)

#### ✅ Fase 5: Preparacao Comercial — CONCLUIDA
17. ✅ **Multi-tenancy**: tabelas `organizations` e `organization_members` criadas com RLS
    - Enum `org_role` (owner, admin, member)
    - Funcoes helper `is_org_member()` e `get_org_role()`
18. ✅ **Dashboard de Monitoramento**: `/api/monitoramento` (admin only)
    - Estatisticas de tabelas via `get_cache_table_stats()`
    - KPIs: total rows, tabelas cache, organizacoes, membros
    - Barras de capacidade: Free / Pro / Pro+Replicas
19. ⏳ **Migracao de dados para org_id**: pendente (vincular sellers a organizacoes)

---

### Pendencias Menores
- Magalu ainda salva tokens no localStorage (integracao secundaria)
- `as any` residual em `ImportPreviewTable.tsx` (shopee_sales)
- `as any` residual em `SellerContext.tsx` (query builder)

### Estimativa de Capacidade
- Free tier: ate ~20-30 usuarios
- Pro tier ($25/mes): ate ~200 usuarios
- Pro + read replicas: ate ~1000 usuarios
