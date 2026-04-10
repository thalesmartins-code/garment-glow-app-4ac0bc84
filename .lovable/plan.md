

## Plan: Fix header store/seller filter reactivity + remove Revenue by Marketplace card

### Problem
1. **Seller/store switching doesn't update sales data**: The `MercadoLivre.tsx` page initializes local state from `salesCache` only once. When the seller or store changes in the header, `MLStoreContext` resets the cache, but the page's local state (`allDaily`, `allHourly`, `connected`, etc.) retains stale values. The `cacheLoadedRef` also blocks re-fetching after the initial load.
2. **Revenue by Marketplace card**: User wants it removed from the sales page.
3. **Estoque and Anúncios pages**: Already react to `selectedStore` changes via `MLInventoryContext` (which re-fetches on store change). However, we should verify the seller change propagates correctly.

### Changes

#### 1. Fix seller/store reactivity in `MercadoLivre.tsx` (Sales page)
- **Reset local state when salesCache resets**: Add an effect that watches `salesCache` and syncs local state (`allDaily`, `allHourly`, `allProductSales`, `connected`, `mlUser`, `cachedAccessToken`, `productStockMap`) back from it when the cache is reset (e.g., all arrays empty after a seller/store change).
- **Reset `cacheLoadedRef` on seller change**: Add `selectedSeller?.id` to the dependency that resets `cacheLoadedRef.current = false`, so data is re-fetched when the seller changes.
- **Reset `autoSyncTriggeredRef` on seller/store change**: So auto-sync triggers again for the new seller/store.

#### 2. Remove RevenueByMarketplace card from sales page
- Remove the `RevenueByMarketplace` render block (lines ~1382-1385).
- Remove the `revenueByMarketplace` useMemo (lines ~1074-1129).
- Remove the import of `RevenueByMarketplace` (line 23).

#### 3. Ensure Estoque/Anúncios react to seller changes
- `MLInventoryContext` already uses `useMLStore().selectedStore` and re-fetches on change.
- `MLStoreContext` already re-fetches stores when `selectedSeller?.id` changes and resets the cache.
- This chain should work: seller change → MLStoreContext refetches → selectedStore resets → MLInventoryContext refetches. No additional changes needed for these pages.

### Files to modify
- `src/pages/MercadoLivre.tsx` — fix reactivity + remove RevenueByMarketplace

