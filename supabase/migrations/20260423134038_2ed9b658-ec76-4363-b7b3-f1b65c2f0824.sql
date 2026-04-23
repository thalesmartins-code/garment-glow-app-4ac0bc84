CREATE TABLE public.ml_state_daily_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ml_user_id TEXT NOT NULL DEFAULT '',
  seller_id UUID NULL,
  date DATE NOT NULL,
  uf TEXT NOT NULL,
  state_name TEXT NOT NULL DEFAULT '',
  qty_orders INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  approved_revenue NUMERIC NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ml_state_daily_cache ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX ml_state_daily_cache_unique
  ON public.ml_state_daily_cache (user_id, ml_user_id, date, uf);

CREATE INDEX ml_state_daily_cache_user_date_idx
  ON public.ml_state_daily_cache (user_id, date);

CREATE POLICY "Users can select own ml_state_daily_cache"
  ON public.ml_state_daily_cache FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ml_state_daily_cache"
  ON public.ml_state_daily_cache FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ml_state_daily_cache"
  ON public.ml_state_daily_cache FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ml_state_daily_cache"
  ON public.ml_state_daily_cache FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());