CREATE TABLE IF NOT EXISTS public.ml_hourly_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  hour SMALLINT NOT NULL,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  approved_revenue NUMERIC NOT NULL DEFAULT 0,
  qty_orders INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ml_hourly_cache ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS ml_hourly_cache_user_date_hour_idx
  ON public.ml_hourly_cache (user_id, date, hour);

CREATE INDEX IF NOT EXISTS ml_hourly_cache_user_date_idx
  ON public.ml_hourly_cache (user_id, date);

CREATE POLICY "Users can select own ml_hourly_cache"
ON public.ml_hourly_cache
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ml_hourly_cache"
ON public.ml_hourly_cache
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ml_hourly_cache"
ON public.ml_hourly_cache
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own ml_hourly_cache"
ON public.ml_hourly_cache
FOR DELETE
TO authenticated
USING (user_id = auth.uid());