
-- 1. Fix audit_log RLS: replace WITH CHECK (true) with a proper SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  _actor_id uuid,
  _action text,
  _target_user_id uuid DEFAULT NULL,
  _details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, target_user_id, details)
  VALUES (_actor_id, _action, _target_user_id, _details);
END;
$$;

-- Drop the permissive INSERT policy
DROP POLICY IF EXISTS "Service can insert audit_log" ON public.audit_log;

-- No INSERT policy needed — inserts go through the SECURITY DEFINER function only

-- 2. Composite indexes for range queries (IF NOT EXISTS to be safe)
CREATE INDEX IF NOT EXISTS idx_ml_daily_cache_lookup
  ON public.ml_daily_cache (user_id, ml_user_id, date);

CREATE INDEX IF NOT EXISTS idx_ml_product_daily_cache_lookup
  ON public.ml_product_daily_cache (user_id, date);

CREATE INDEX IF NOT EXISTS idx_ml_hourly_cache_lookup
  ON public.ml_hourly_cache (user_id, ml_user_id, date, hour);

CREATE INDEX IF NOT EXISTS idx_ml_ads_daily_cache_lookup
  ON public.ml_ads_daily_cache (user_id, ml_user_id, date);

-- 3. Monitoring function for cache table stats
CREATE OR REPLACE FUNCTION public.get_cache_table_stats()
RETURNS TABLE (
  table_name text,
  row_count bigint,
  total_size text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.relname::text AS table_name,
    t.n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(t.relid)) AS total_size
  FROM pg_stat_user_tables t
  WHERE t.schemaname = 'public'
    AND t.relname IN (
      'ml_daily_cache', 'ml_hourly_cache', 'ml_product_daily_cache',
      'ml_ads_daily_cache', 'ml_ads_campaigns_cache', 'ml_ads_products_cache',
      'ml_sync_log', 'ml_user_cache', 'ml_tokens'
    )
  ORDER BY t.n_live_tup DESC;
$$;
