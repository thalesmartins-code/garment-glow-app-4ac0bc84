## Multi-Store ML Support — IMPLEMENTED

### What was done
1. **Database migrations**: Added primary key `(user_id, ml_user_id)` on `ml_user_cache`, unique index `(user_id, ml_user_id)` on `ml_tokens`
2. **MLStoreContext** (`src/contexts/MLStoreContext.tsx`): Manages store list and selection
3. **MLStoreSelector** (`src/components/mercadolivre/MLStoreSelector.tsx`): Dropdown with "Todas as lojas" + individual stores
4. **Integrations page**: `saveMLTokens` now upserts; "Adicionar loja" button on connected ML card; disconnect removes all tokens
5. **MercadoLivre dashboard**: All cache queries filter by `ml_user_id` when specific store selected; sync iterates all stores when "Todas"
6. **MLInventoryContext**: Fetches inventory per store or merges all stores
7. **App.tsx**: ML routes wrapped with `MLStoreProvider`
