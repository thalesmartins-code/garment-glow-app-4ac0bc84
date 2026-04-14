

## Modo TV para Vendas (API/Mercado Livre)

### Overview
Create a new TV Mode page specifically for the Mercado Livre (API) sales dashboard. It will cycle between Sandrini (all stores) and Buy Clock (all stores), showing KPI cards, hourly revenue chart, and top products ranking -- all fetched from real Supabase data.

### Route
- New route: `/api/tv` inside the API layout group (or standalone like `/tv` is today)
- Since it needs `HeaderScopeContext` + `MLStoreProvider` + `MLInventoryProvider`, it will be placed as a standalone route wrapping those providers directly (similar to how `/tv` works today -- no sidebar/header chrome).

### Page: `src/pages/TVModeVendas.tsx`

**Seller Cycling Logic:**
- Hardcoded seller list from DB: Sandrini (`8c57110c-...`) and Buy Clock (`52a7ed04-...`)
- Each seller shows "total" (all stores aggregated)
- Cycle interval configurable (default 15s), stored in localStorage
- No sub-views (diario/mensal) -- just current day data (Hoje)

**Data Fetching (per seller cycle):**
- On seller change, query Supabase directly (no context dependency):
  1. `ml_daily_cache` filtered by `seller_id` + today's date → KPI metrics
  2. `ml_hourly_cache` filtered by `seller_id` + today's date → hourly chart
  3. `ml_product_daily_cache` filtered by `seller_id` + today's date → top 5 products
- Auto-refresh every N minutes (default 5min)

**Layout (fullscreen, no sidebar):**
1. **Top bar**: Seller logo + name, period label, seller pills, clock, settings gear, fullscreen button
2. **Progress bar**: cycle progress (same as existing TV mode)
3. **KPI row**: Receita Total, Pedidos, Ticket Médio, Visitas, Conversão (5 cards, compact)
4. **Main content grid**:
   - Left (2/3): Hourly revenue chart (ComposedChart with bars for orders + area for revenue)
   - Right (1/3): Top 5 products table (rank, thumbnail, title, qty, revenue, % share)
5. **Footer**: refresh/cycle info

### Changes Summary

| File | Action |
|------|--------|
| `src/pages/TVModeVendas.tsx` | Create -- standalone TV page for API sales |
| `src/App.tsx` | Add route `/api/tv` (protected, standalone -- no ApiLayout wrapper) |

### Technical Details

- The page will use `useAuth()` for `user.id` and query Supabase directly with `seller_id` filters, avoiding the complexity of context providers.
- Seller definitions (id, name, logo) are hardcoded in the component using the existing logo assets.
- The hourly chart reuses the same Recharts `ComposedChart` pattern from `MercadoLivre.tsx`.
- The top products table reuses the inline rendering pattern from `MercadoLivre.tsx` lines 1588-1646.
- KPICard component is reused as-is with `variant="minimal"` and `size="compact"`.

