

## Problem

The **Ranking de Anúncios** page calculates revenue incorrectly by multiplying `qty_sold × current_price`. This ignores price changes, discounts, and promotions over the period. The **Top Anúncios** card correctly sums the actual `revenue` field from `ml_product_daily_cache`.

## Root Cause

In `src/pages/mercadolivre/MLProdutos.tsx`, line 326:
```tsx
const rev = sold * i.price;  // WRONG — uses current catalog price
```

Meanwhile `src/pages/MercadoLivre.tsx` line 391 correctly sums:
```tsx
agg[p.item_id].revenue += p.revenue;  // CORRECT — uses recorded daily revenue
```

## Plan

### 1. Fetch revenue alongside qty_sold in ranking query

In `MLProdutos.tsx`, the `fetchRankingSales` function (line 206) currently selects only `item_id, qty_sold`. Change it to also select `revenue`:

```sql
.select("item_id, qty_sold, revenue")
```

### 2. Build a revenue map alongside the sold map

Update `rankingSoldMap` (or add a parallel `rankingRevenueMap`) to also aggregate `revenue` per `item_id` from the raw data.

### 3. Use real revenue in rankingAll

Replace `const rev = sold * i.price` with the aggregated revenue from the map. Fall back to `sold * price` only when no period data exists (the "Todo o periodo" / lifetime case using `sold_quantity`).

### 4. Propagate to brandData

The `brandData` memo also uses `getSold(i.id) * i.price` for revenue. Apply the same fix there.

---

**Technical details**: Only `src/pages/mercadolivre/MLProdutos.tsx` needs changes. No database or edge function modifications required.

