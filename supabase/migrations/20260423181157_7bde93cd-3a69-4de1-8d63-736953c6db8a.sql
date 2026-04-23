
-- Backfill organization_id in all ML cache tables using ml_tokens as source of truth
-- The legacy sync wrote NULL, blocking RLS reads for all org members.

WITH token_map AS (
  SELECT DISTINCT ON (ml_user_id) ml_user_id, organization_id, seller_id
  FROM public.ml_tokens
  WHERE organization_id IS NOT NULL
  ORDER BY ml_user_id, updated_at DESC
)
UPDATE public.ml_daily_cache c
SET organization_id = t.organization_id,
    seller_id = COALESCE(c.seller_id, t.seller_id)
FROM token_map t
WHERE c.ml_user_id = t.ml_user_id AND c.organization_id IS NULL;

WITH token_map AS (
  SELECT DISTINCT ON (ml_user_id) ml_user_id, organization_id, seller_id
  FROM public.ml_tokens
  WHERE organization_id IS NOT NULL
  ORDER BY ml_user_id, updated_at DESC
)
UPDATE public.ml_hourly_cache c
SET organization_id = t.organization_id,
    seller_id = COALESCE(c.seller_id, t.seller_id)
FROM token_map t
WHERE c.ml_user_id = t.ml_user_id AND c.organization_id IS NULL;

WITH token_map AS (
  SELECT DISTINCT ON (ml_user_id) ml_user_id, organization_id, seller_id
  FROM public.ml_tokens
  WHERE organization_id IS NOT NULL
  ORDER BY ml_user_id, updated_at DESC
)
UPDATE public.ml_product_daily_cache c
SET organization_id = t.organization_id,
    seller_id = COALESCE(c.seller_id, t.seller_id)
FROM token_map t
WHERE c.ml_user_id = t.ml_user_id AND c.organization_id IS NULL;

WITH token_map AS (
  SELECT DISTINCT ON (ml_user_id) ml_user_id, organization_id, seller_id
  FROM public.ml_tokens
  WHERE organization_id IS NOT NULL
  ORDER BY ml_user_id, updated_at DESC
)
UPDATE public.ml_state_daily_cache c
SET organization_id = t.organization_id,
    seller_id = COALESCE(c.seller_id, t.seller_id)
FROM token_map t
WHERE c.ml_user_id = t.ml_user_id AND c.organization_id IS NULL;

WITH token_map AS (
  SELECT DISTINCT ON (ml_user_id::text) ml_user_id::text AS ml_user_id, organization_id, seller_id
  FROM public.ml_tokens
  WHERE organization_id IS NOT NULL
  ORDER BY ml_user_id::text, updated_at DESC
)
UPDATE public.ml_user_cache c
SET organization_id = t.organization_id,
    seller_id = COALESCE(c.seller_id, t.seller_id)
FROM token_map t
WHERE c.ml_user_id::text = t.ml_user_id AND c.organization_id IS NULL;

WITH token_map AS (
  SELECT DISTINCT ON (ml_user_id) ml_user_id, organization_id, seller_id
  FROM public.ml_tokens
  WHERE organization_id IS NOT NULL
  ORDER BY ml_user_id, updated_at DESC
)
UPDATE public.ml_sync_log c
SET organization_id = t.organization_id,
    seller_id = COALESCE(c.seller_id, t.seller_id)
FROM token_map t
WHERE c.ml_user_id = t.ml_user_id AND c.organization_id IS NULL;

WITH token_map AS (
  SELECT DISTINCT ON (ml_user_id) ml_user_id, organization_id, seller_id
  FROM public.ml_tokens
  WHERE organization_id IS NOT NULL
  ORDER BY ml_user_id, updated_at DESC
)
UPDATE public.ml_ads_daily_cache c
SET organization_id = t.organization_id,
    seller_id = COALESCE(c.seller_id, t.seller_id)
FROM token_map t
WHERE c.ml_user_id = t.ml_user_id AND c.organization_id IS NULL;

WITH token_map AS (
  SELECT DISTINCT ON (ml_user_id) ml_user_id, organization_id, seller_id
  FROM public.ml_tokens
  WHERE organization_id IS NOT NULL
  ORDER BY ml_user_id, updated_at DESC
)
UPDATE public.ml_ads_campaigns_cache c
SET organization_id = t.organization_id,
    seller_id = COALESCE(c.seller_id, t.seller_id)
FROM token_map t
WHERE c.ml_user_id = t.ml_user_id AND c.organization_id IS NULL;

WITH token_map AS (
  SELECT DISTINCT ON (ml_user_id) ml_user_id, organization_id, seller_id
  FROM public.ml_tokens
  WHERE organization_id IS NOT NULL
  ORDER BY ml_user_id, updated_at DESC
)
UPDATE public.ml_ads_products_cache c
SET organization_id = t.organization_id,
    seller_id = COALESCE(c.seller_id, t.seller_id)
FROM token_map t
WHERE c.ml_user_id = t.ml_user_id AND c.organization_id IS NULL;
