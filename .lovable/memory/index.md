# Project Memory

## Core
Dark theme, minimal. Plus Jakarta Sans, `shadow-sm`, `bg-muted` hovers. No icons on KPI card titles.
Supabase with RLS default-deny. React Query (`useMLQueries`). `verify_jwt=true`. No secrets in frontend state.
Server-side data aggregation (`ml-products-aggregated`). Retain all historical data (no cleanup).
App é 100% API. Rota raiz `/` redireciona para `/api`. Ambiente `/sheets` foi removido completamente.
`SellerMarketplaceBar` is the single source of truth for deterministic seller selection.
FloatingChat removed — do not re-add. No Lovable native payments (Stripe/Paddle) — use Mercado Pago via Edge Functions.

## Memories
- [Visual identity](mem://style/visual-identity) — Typography (Plus Jakarta Sans), spacing, minimal KPI variants
- [UI Elements](mem://style/ui-elements) — Standardized hovers (bg-muted), destructive buttons, secondary checkboxes
- [Data persistence](mem://tech/data-persistence) — RLS roles (admin/editor) and unique indexes for sales_data
- [State management](mem://tech/state-management) — HeaderScopeContext logic and explicit ml_user_id mapping
- [System Architecture](mem://auth/system-architecture) — Default-deny RBAC, roleAccess.ts centralizes access control
- [Mercado Livre Config](mem://integrations/mercado-livre/config) — Redirect URI setup
- [Integrations UI logic](mem://features/integrations/ui-logic) — Compact layout without header stores for /api/integracoes
- [Mercado Livre Auth Flow](mem://integrations/mercado-livre/auth-flow) — OAuth 2.0 PKCE via Edge Functions, auto-capture
- [Required Secrets](mem://integrations/required-secrets) — Secrets ativos no modo 100% API (ML, Magalu); GOOGLE_* removidos
- [Magalu Metrics](mem://integrations/magalu/metrics-display) — Edge function 30-day stats stored in localstorage
- [Magalu Auth Logic](mem://integrations/magalu/auth-logic) — OAuth2 SDK via popup, auth token to edge function
- [Callback Routing](mem://features/integrations/callback-routing) — OAuthCodeRedirect always routes to /api/integracoes
- [Mercado Livre Token Management](mem://integrations/mercado-livre/token-management) — Cron job refreshing tokens every 20min
- [Dashboard Logic](mem://project/dashboard-logic) — Period filters are inclusive (day + n days), explicit labels
- [Historical Sync](mem://features/mercado-livre/historical-sync) — Visual real-time progress bar, post-import summary
- [Product Tracking](mem://tech/mercado-livre-product-tracking) — Async 200 batch upsert for ml_product_daily_cache
- [Product Links](mem://features/mercado-livre/product-links) — Hyphen formatting requirement for MLB external links
- [Mercado Livre Inventory Logic](mem://tech/mercado-libre-inventory-logic) — BRAND, SKU attributes, source of truth
- [Multi Store Support](mem://integrations/mercado-livre/multi-store-support) — MLStoreContext maps stores and supports 'All stores' aggregation
- [Mercado Livre Data Structure](mem://integrations/mercado-livre/data-structure) — Composite unique user_id + ml_user_id constraint
- [Integration Security](mem://auth/integration-security) — Disconnect requires re-authentication via supabase password
- [App Architecture](mem://project/app-architecture) — App é 100% API, sem /sheets, framer-motion transitions
- [Multi Marketplace Architecture](mem://tech/multi-marketplace-architecture) — MarketplaceContext aggregates simulated/real data, visual badges
- [Product Ranking Logic](mem://features/api-environment/product-ranking-logic) — 10 items list, top 3 medals, flex-1 spacing
- [Store Naming](mem://integrations/mercado-livre/store-naming) — custom_name syncs perfectly with store_name
- [Sync Progress Bar](mem://features/mercado-livre/sync-progress-bar) — 33% intervals (blue, orange, green) colors
- [Sync Status Indicator](mem://features/mercado-livre/sync-status-indicator) — Tooltip history of last 10 operations
- [Shopee Parser](mem://features/import/shopee-parser) — Skips 1-3 rows, converts formats
- [Sync Logs Logic](mem://tech/mercado-libre-sync-logs-logic) — date_from + date_to unique tracking
- [Seller Management UI](mem://features/seller-management/ui-style) — primary border, semantic hovers (green, muted, red)
- [Account Menu](mem://features/navigation/account-menu) — Navigation organization in User menu
- [Import Configuration](mem://features/import/configuration) — Parsers and marketplace mapping (used by /api/importacao)
- [Marketplace Branding](mem://style/marketplace-branding) — Specific hex colors and icon guidelines per brand
- [Header Selectors](mem://features/navigation/header-selectors) — Deterministic single-select stores, 'Buscar...' placeholder
- [Seller Management Logic](mem://features/seller-management/logic) — Sorting by store count, alphabetical fallback
- [Standardized Headers](mem://style/standardized-headers) — pt-4, sticky top-0 bg-card layout patterns
- [Import UI Logic](mem://features/import/ui-logic) — SellerMarketplaceBar showStores=false
- [Multi Seller Store Mapping](mem://tech/multi-seller-store-mapping) — external_id matches ml_user_id
- [Bubble Chart Logic](mem://features/vendas/bubble-chart-logic) — Day (x) vs Hour (y) mapping, market offset
- [API Sidebar Structure](mem://features/navigation/api-sidebar-structure) — Thematic sections: Vendas, Catálogo, Crescimento, etc.
- [Dashboard Consolidation](mem://project/dashboard-consolidation) — Vendas + Relatórios tabs using framer-motion
- [Comparison Deltas](mem://features/vendas/comparison-deltas) — Automatically extends fetch range, text-xs without labels
- [Mercado Livre Modules](mem://features/mercado-livre/modules) — Ads, Financial, Reputation specific rules
- [Card Headers Standardization](mem://style/card-headers-standardization) — text-sm font-medium text-foreground, no icons
- [Header Layout API](mem://features/navigation/header-layout-api) — Stores aligned left, tabs right, compact
- [Ads Summary Card](mem://integrations/mercado-livre/ads-summary-card) — sparkline, ROAS focus, gap-y-3 metrics grid
- [Reputation Display](mem://integrations/mercado-livre/reputation-display) — Real-time termometer and precision stats
- [Charts Standardization](mem://style/charts-standardization) — Chronological order ascending, 220px, pb-3
- [API Route Mapping](mem://features/navigation/api-route-mapping) — Naming consistency (/api/anuncios, /api/publicidade)
- [ML Subpage Pattern](mem://style/ml-subpage-pattern) — Compact KPI cards, sticky headers, standard ABC colors
- [Goals Persistence State](mem://tech/goals-persistence-state) — localStorage target saving logic
- [Anuncios Page](mem://features/mercado-livre/anuncios-page) — Default 'Today' filter, store badges
- [Mercado Libre Cache System](mem://tech/mercado-libre-cache-system) — 30min DB TTL, 5min local TTL for ads
- [ABC Curve Logic](mem://features/mercado-livre/abc-curve-logic) — Pareto principle 80/15/5 visualization
- [Estoque Page](mem://features/mercado-livre/estoque-page) — Case insensitive search, ignore zero-stock limit on search
- [Search Components](mem://style/search-components) — 'Buscar...' global standard, compact controls
- [Placeholder Routes](mem://features/mercado-livre/placeholder-routes) — Pedidos & Publicidade are under development placeholders
- [View Todos Logic](mem://features/vendas/view-todos-logic) — Independent colored lines, 24*n limit
- [Vendas View Logic](mem://project/vendas-view-logic) — 6 column grid, specific standard names (Receita, Pedidos)
- [Goals Card](mem://features/vendas/goals-card) — Accumulated monthly, ignores selected period filter
- [Rupture Card Behavior](mem://features/mercado-livre/rupture-card-behavior) — Collapsed by default, entire header clickable
- [Brand Analysis Logic](mem://features/mercado-livre/brand-analysis-logic) — 4 specific KPIs, period synced with ranking
- [Responsive Design](mem://project/responsive-design) — Sheet drawer, adaptive p-4 to p-8, horizontal scrolls
- [Store Branding Colors](mem://style/store-branding-colors) — storeColors.ts palette guidelines
- [Admin Menu Management](mem://features/admin-menu-management) — Admins can personalize visibility in profile
- [KPI Card Variants](mem://style/kpi-card-variants) — 'tv' variant text-3xl scaling
- [Layout Logic](mem://features/navigation/layout-logic) — hideStores prop hides only chips, keeps titles
- [Audit Logging](mem://tech/audit-logging) — Tracks admin actions with actor_id and target user
- [User Profile](mem://features/user-profile) — Strictly personal, no admin controls
- [Admin Portal](mem://features/navigation/admin-portal) — /api/usuarios for users management
- [Security Features](mem://auth/security-features) — Strong password policy, self-ban protection
- [Login Page](mem://style/login-page) — GPU keyframes, framer-motion layout
- [Multi Seller Data Integrity](mem://tech/multi-seller-data-integrity) — Mandatory seller_id filter on all stores
- [TV Mode](mem://features/tv-mode) — Vertical 3-tier layout, parallel load and rotation
- [Mercado Livre Data Logic](mem://tech/mercado-livre/data-logic) — server side aggregation for rankings
- [Architecture Modernization](mem://tech/architecture/modernization) — React Query, verify_jwt=true
- [Security Hardening](mem://auth/security/hardening) — No secrets in state, RLS limits, avatars bucket limits
- [Payments Constraints](mem://tech/constraints/payments) — Manual MP handling required, no lovable Stripe
- [Multi Tenancy Architecture](mem://tech/multi-tenancy-architecture) — organizations tables, get_org_role
- [Admin Monitoring](mem://features/admin/monitoring) — /api/monitoramento cache size tracking
- [Mercado Libre Sync Architecture](mem://tech/mercado-libre-sync-architecture) — Offset limit split, strictly local time
- [Data Retention Policy](mem://tech/data-retention-policy) — No automatic historical cleanup
