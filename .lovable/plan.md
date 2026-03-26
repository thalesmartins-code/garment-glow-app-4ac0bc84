

## Multi-Store ML Support Plan

### Overview
Enable connecting multiple Mercado Livre accounts and switching between them (or aggregating all) across the entire ML environment.

### Current State
- `ml_tokens` already has `ml_user_id` but code assumes one token per user (`maybeSingle()`, deletes all before insert)
- Cache tables (`ml_daily_cache`, `ml_hourly_cache`, `ml_product_daily_cache`) already have `ml_user_id` columns but queries only filter by `user_id`
- `ml_user_cache` has unique constraint on `user_id` (only one store per user)
- `MLInventoryContext` fetches a single token

### Database Changes

1. **Alter `ml_user_cache`** — drop unique constraint on `user_id`, add unique on `(user_id, ml_user_id)` to allow multiple stores per user
2. **Alter `ml_tokens`** — add unique constraint on `(user_id, ml_user_id)` to enable proper upserts instead of delete-all-then-insert

### New Context: `MLStoreContext`

Create `src/contexts/MLStoreContext.tsx`:
- Queries `ml_tokens` for all tokens belonging to the current user (fetches `ml_user_id` + nickname from `ml_user_cache`)
- Exposes: `stores: { ml_user_id, nickname }[]`, `selectedStore: string | "all"`, `setSelectedStore()`
- Wraps the ML layout so it's available on all ML pages

### Changes by Area

**1. Integrations Page (`Integrations.tsx`)**
- **"Adicionar loja" button**: visible when ML is already connected; triggers the same OAuth flow but does NOT delete existing tokens
- **`saveMLTokens`**: change from delete-all + insert to upsert on `(user_id, ml_user_id)`
- **Token check on mount**: query all ML tokens, mark connected if any exist
- Show list of connected ML stores with individual disconnect option

**2. Store Selector (new component)**
- `src/components/mercadolivre/MLStoreSelector.tsx` — dropdown rendered in the ML header area
- Options: "Todas as lojas" + one entry per connected store (showing nickname)
- Controlled by `MLStoreContext`

**3. Dashboard Page (`MercadoLivre.tsx`)**
- When a specific store is selected: pass its `access_token` to sync, filter cache queries by `ml_user_id`
- When "Todas" is selected: aggregate across all `ml_user_id` values (no ml_user_id filter)
- `loadFromCache`, `loadHourlyCache`, `loadProductCache`: add optional `.eq("ml_user_id", ...)` when store is selected
- `syncFromAPI`: iterate over all tokens when "Todas", or use the selected store's token
- `saveToCache`: already writes `ml_user_id` per store — no changes needed

**4. Inventory Context (`MLInventoryContext.tsx`)**
- Accept `selectedStore` from `MLStoreContext`
- When specific store: fetch token for that `ml_user_id`, call `ml-inventory` with it
- When "Todas": fetch inventory for each store and merge items arrays

**5. Stock & Products Pages (`MLEstoque.tsx`, `MLProdutos.tsx`)**
- Already consume `MLInventoryContext` — no direct changes needed beyond what the context provides

**6. Edge Functions**
- `ml-oauth`: no changes needed (already returns `user_id` from ML)
- `mercado-libre-integration`: no changes needed (receives `access_token` per call)
- `ml-inventory`: no changes needed (receives `access_token` per call)
- `ml-token-refresh`: update to refresh ALL tokens in `ml_tokens` table, not just one per user

### Implementation Order

1. Database migrations (constraints)
2. `MLStoreContext` + `MLStoreSelector` component
3. Update `Integrations.tsx` (multi-token save, "Adicionar loja" button)
4. Update `MercadoLivre.tsx` (filter queries by `ml_user_id`)
5. Update `MLInventoryContext` (multi-store support)
6. Update `ml-token-refresh` edge function

### Technical Details

```text
┌─────────────────┐
│  MLStoreContext  │  ← queries ml_tokens + ml_user_cache
│  selectedStore   │
└────────┬────────┘
         │
    ┌────┴────┐
    │ "all"   │  → no ml_user_id filter, aggregate
    │ "12345" │  → .eq("ml_user_id", "12345")
    └─────────┘
```

Cache query pattern when store selected:
```typescript
let query = supabase.from("ml_daily_cache").select("*").eq("user_id", user.id);
if (selectedStore !== "all") {
  query = query.eq("ml_user_id", selectedStore);
}
```

