

# Sugestões de Melhorias para Escalabilidade Comercial

Plano dividido em 4 áreas (segurança, organização de código, CSS/design system, performance). Cada item tem **prioridade** (🔴 crítico, 🟡 importante, 🟢 polimento) e impacto estimado. Você pode aprovar tudo ou escolher fases.

---

## 🔒 1. SEGURANÇA

### 🔴 1.1 — Endurecer `verify_jwt` nas Edge Functions
Hoje **12 das 17** edge functions estão com `verify_jwt = false` no `supabase/config.toml`. Várias delas (`admin-create-user`, `admin-list-users`, `ml-inventory`, `ml-ads`, `ml-reputation`, `ml-products-aggregated`, `ml-precos-custos`) fazem validação manual via `getUser()`, mas isso é frágil — qualquer regressão expõe a função.

**Ação:** ligar `verify_jwt = true` em todas exceto as públicas legítimas (`ml-oauth` callback, `org-invite-accept`, `ml-token-refresh` se chamada por cron). Migrar para `getClaims(token)` (mais rápido, usa JWKS local).

### 🔴 1.2 — Rotacionar segredos sensíveis suspeitos
Há um segredo nomeado `"Marketplace Analytics Pro"` (nome estranho, possivelmente colado por engano) e `MAGALU_*` (4 segredos não usados após a remoção do Magalu). Limpar reduz superfície de ataque.

**Ação:** remover secrets Magalu (`MAGALU_CLIENT_ID`, `MAGALU_CLIENT_SECRET`, `MAGALU_API_KEY`, `MAGALU_API_KEY_ID`, `MAGALU_API_KEY_SECRET`) e o segredo de nome esquisito. Auditar uso antes.

### 🟡 1.3 — Rate limiting básico nas edge functions de OAuth/admin
Funções `ml-oauth`, `admin-create-user` não têm proteção contra abuso. Em escala comercial isso vira vetor de enumeração de usuários e spam.

**Ação:** adicionar rate limit por IP/user usando uma tabela `rate_limits` (chave + janela) consultada no início da função. ~30 linhas por função.

### 🟡 1.4 — Headers de segurança no `index.html`
Faltam CSP, `X-Frame-Options`, `Referrer-Policy`. Sem CSP, qualquer XSS injetado vira execução total.

**Ação:** adicionar `<meta>` headers em `index.html` + recomendar configurar headers no provedor de hosting (analytics.alcavie.com).

### 🟢 1.5 — Validação de input com Zod nas edge functions
Hoje a validação é manual (regex em `admin-create-user`). Padronizar com Zod no Deno reduz bugs.

---

## 🗂️ 2. ORGANIZAÇÃO DE CÓDIGO

### 🔴 2.1 — Quebrar páginas gigantes
Tamanhos atuais preocupantes:
- `MLProdutos.tsx` — **1809 linhas**
- `MLEstoque.tsx` — **1350 linhas**
- `Integrations.tsx` — **965 linhas**
- `MLRelatorios.tsx` — **651 linhas**

**Ação:** extrair em componentes co-localizados:
```text
src/pages/mercadolivre/MLProdutos/
  ├── index.tsx              (orquestração, ~200 linhas)
  ├── ProductsTable.tsx
  ├── ProductFilters.tsx
  ├── BrandAnalysisTab.tsx
  ├── ABCCurveTab.tsx
  └── hooks/useProductsData.ts
```
Mesmo padrão para `MLEstoque` e `Integrations`. Reduz risco de merge conflicts e melhora cold-load (split chunks).

### 🟡 2.2 — Centralizar formatadores e utilitários
`currencyFmt`, formatters de data, `parseISO + format` aparecem duplicados em ~15 arquivos.

**Ação:** criar `src/lib/formatters.ts` com `formatCurrency`, `formatDate`, `formatPercent`, `formatCompactNumber`. Uma única fonte de verdade.

### 🟡 2.3 — Camada de serviços para Supabase
Componentes hoje chamam `supabase.from(...).select(...)` direto. Em escala isso vira manutenção pesada (mudou nome de coluna → caça em 40 arquivos).

**Ação:** criar `src/services/` com módulos por domínio: `mlSalesService.ts`, `organizationService.ts`, `userService.ts`. Páginas/hooks só consomem serviços. Já existe `mlCacheService.ts` — generalizar o padrão.

### 🟢 2.4 — Tipos compartilhados em `src/types/`
Várias interfaces (`MLStore`, `DailyBreakdown`, etc.) vivem dentro de contexts/hooks. Mover para `src/types/ml.ts`.

### 🟢 2.5 — Eliminar `any` (12 arquivos)
Tipar corretamente respostas de edge functions e props. Habilitar `noImplicitAny` no `tsconfig.app.json`.

### 🟢 2.6 — Limpar `console.log/warn/error` (13 arquivos)
Substituir por um wrapper `src/lib/logger.ts` que silencia em produção e envia para Sentry/Logflare em casos críticos.

---

## 🎨 3. ORGANIZAÇÃO CSS / DESIGN SYSTEM

### 🟡 3.1 — Erradicar cores diretas (53 ocorrências)
Encontradas 53 usos de `text-white`, `bg-black`, etc. e 1 hex hardcoded. Quebra dark mode futuro e branding multi-tenant.

**Ação:** substituir por tokens semânticos (`text-primary-foreground`, `bg-card`). Adicionar regra ESLint `no-restricted-syntax` proibindo classes de cor literais.

### 🟡 3.2 — Variantes via CVA para padrões repetidos
KPI cards, badges de loja e botões de ação repetem combinações de classes longas. Já existe `KPICard` com variant `tv` — expandir esse padrão.

**Ação:** padronizar com `class-variance-authority` (já instalado via shadcn) para `KPICard`, `StoreChip`, `MetricBadge`. Reduz duplicação de className em ~30%.

### 🟢 3.3 — Consolidar tokens de espaçamento
Adicionar tokens `--space-section`, `--space-card`, `--space-inline` no `index.css` para padronizar gaps entre páginas.

### 🟢 3.4 — Documentar design system
Criar `src/components/ui/README.md` listando: paleta semântica, variantes, quando usar cada componente. Onboarding de novos devs cai de dias para horas.

---

## ⚡ 4. PERFORMANCE

### 🔴 4.1 — Code-splitting agressivo
Hoje só as páginas ML são `React.lazy`. `Sellers`, `Integrations` (965 linhas!), `UserManagement`, `AdminMonitoring`, `OrgSettings` carregam no bundle inicial.

**Ação:** mover todas para `React.lazy`. Estimativa: −150 KB no bundle inicial.

### 🔴 4.2 — Configurar `manualChunks` no Vite
Sem chunking manual, libs pesadas (recharts, framer-motion, date-fns, supabase) entram em chunks aleatórios e quebram o cache do browser a cada deploy.

**Ação:** adicionar em `vite.config.ts`:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'supabase': ['@supabase/supabase-js'],
        'charts': ['recharts'],
        'ui-vendor': ['framer-motion', '@radix-ui/react-dialog', /* ... */],
      }
    }
  }
}
```

### 🟡 4.3 — `React.memo` + `useMemo` em componentes pesados
`MLRevenueChart`, `BrazilHeatMap`, `MLTopProducts`, `HourlySalesTable` re-renderizam toda vez que o filtro de período muda no header. Em telas com 10+ cards o efeito é cumulativo.

**Ação:** envelopar em `memo`, garantir que props sejam estáveis (`useCallback`, `useMemo` nos pais).

### 🟡 4.4 — Virtualização em tabelas longas
`MLProdutos` e `MLEstoque` podem renderizar 500+ linhas sem virtualização → travam em listas grandes (já temos sellers com catálogos enormes em vista).

**Ação:** adotar `@tanstack/react-virtual` (sem nova dependência pesada) nas tabelas `MLProdutos` e `MLEstoque`.

### 🟡 4.5 — React Query: `select` para reduzir re-renders
Hooks em `useMLQueries.ts` retornam objetos completos. Páginas que usam só uma fatia ainda re-renderizam.

**Ação:** usar `select: (data) => data.kpis` em consumidores específicos.

### 🟢 4.6 — Pré-conexão a recursos críticos
Adicionar `<link rel="preconnect" href="https://gionpsuunfkkzzjdubfy.supabase.co">` no `index.html`. −100 a 200ms no primeiro request.

### 🟢 4.7 — Imagens (avatars, thumbnails ML) com `loading="lazy"` e `decoding="async"`
Tabela de produtos com 200 thumbs de ML hoje carrega tudo eagerly.

---

## 📦 ENTREGA EM FASES SUGERIDAS

| Fase | Escopo | Esforço | Impacto |
|------|--------|---------|---------|
| **A — Segurança crítica** | 1.1, 1.2, 1.4 | 1 sessão | 🔴 Bloqueia incidentes |
| **B — Performance crítica** | 4.1, 4.2, 4.6 | 1 sessão | Bundle −30%, TTI mais rápido |
| **C — Refactor páginas grandes** | 2.1 (MLProdutos + MLEstoque + Integrations) | 2-3 sessões | Manutenibilidade |
| **D — Design system** | 3.1, 3.2, 2.2 | 1 sessão | Consistência visual |
| **E — Polimento** | 1.3, 1.5, 2.3-2.6, 3.3-3.4, 4.3-4.5, 4.7 | 2 sessões | Qualidade geral |

---

## ❓ COMO PROSSEGUIR

Me diga **qual fase começar** (ou um subset específico) e eu implemento. Recomendo começar pela **Fase A (Segurança)** + **Fase B (Performance)** — juntas dão o maior ROI imediato e não exigem refatorações grandes.

Se quiser ver detalhes técnicos de algum item específico antes de decidir, é só pedir.

