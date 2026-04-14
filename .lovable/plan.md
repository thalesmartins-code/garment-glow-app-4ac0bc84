

## Plano Revisado: Otimizacao, Seguranca e Escalabilidade

### Mudanca principal vs plano anterior

A Fase 3 (retencao de cache) foi reformulada: em vez de apagar dados antigos, o foco passa a ser **preservar todo o historico** e otimizar o acesso a ele via particionamento, indices e queries eficientes.

---

### Fase 1 — Seguranca (Prioridade Alta)

1. **Remover access_token do frontend** — Edge Functions buscam token via `service_role` internamente
2. **Corrigir RLS do audit_log** — substituir `WITH CHECK (true)` por funcao `SECURITY DEFINER`
3. **Habilitar Leaked Password Protection** no dashboard Supabase
4. **Validacao de entrada nas Edge Functions** com Zod

### Fase 2 — Arquitetura e Organizacao de Codigo

5. **Desmembrar MercadoLivre.tsx (1672 linhas)** em hooks e sub-componentes (~8 modulos de 150-250 linhas)
6. **Camada de servico** `src/services/mlCacheService.ts` para centralizar queries Supabase
7. **React Query** para substituir `useState`+`useCallback` manuais — com `staleTime` e invalidacao automatica

### Fase 3 — Performance e Escalabilidade (Historico Preservado)

**Premissa revisada**: todo dado historico e valioso e deve ser mantido indefinidamente. O foco e garantir que o banco suporte crescimento continuo sem degradacao.

8. **Indices compostos para queries de range**
   - `ml_daily_cache(user_id, ml_user_id, date)`
   - `ml_product_daily_cache(user_id, date)`
   - `ml_hourly_cache(user_id, ml_user_id, date, hour)`
   - Estes indices aceleram consultas por periodo sem precisar apagar dados

9. **Paginacao server-side para ml_product_daily_cache**
   - Atualmente usa `limit 5000` hardcoded — vai falhar com crescimento
   - Implementar cursor-based pagination ou agregacao no servidor (Edge Function que retorna dados ja agregados por periodo)

10. **Agregacao de dados historicos antigos (opcional futuro)**
    - Em vez de deletar, criar uma tabela `ml_product_monthly_summary` com dados agregados por mes
    - Queries de periodos antigos (>6 meses) consultam a tabela resumida, queries recentes consultam o cache granular
    - Dados granulares permanecem intactos para drill-down quando necessario

11. **Monitoramento de crescimento**
    - Dashboard SQL simples (view ou funcao) que retorna contagem de linhas e tamanho por tabela
    - Alerta quando `ml_product_daily_cache` ultrapassar 100k rows — gatilho para avaliar particionamento por ano

12. **Lazy loading e code splitting** em todas as sub-rotas ML

### Fase 4 — Preparacao Comercial

13. **Multi-tenancy** com `organization_id` para SaaS
14. **Rate limiting** no frontend para chamadas de sync
15. **Correcoes de erros nas Edge Functions** (offset > 1000, date format invalido)

---

### Detalhes Tecnicos

**Arquivos afetados:**
- `src/pages/MercadoLivre.tsx` — refatoracao principal
- `supabase/functions/mercado-libre-integration/index.ts` — remover token do body
- `supabase/functions/ml-inventory/index.ts` — fix offset e date
- Nova migration: indices compostos
- Novos: `src/hooks/useMLSync.ts`, `src/hooks/useMLDailyCache.ts`, `src/services/mlCacheService.ts`

**Estrategia de historico:**
- Dados granularios nunca sao apagados
- Performance mantida via indices e agregacao opcional
- Crescimento estimado: ~12k rows/mes em `ml_product_daily_cache` — com indices compostos, Postgres suporta milhoes de rows sem problema
- Particionamento por ano so sera necessario se ultrapassar ~5M rows

