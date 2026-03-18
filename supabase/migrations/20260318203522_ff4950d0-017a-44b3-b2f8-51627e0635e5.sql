
CREATE TABLE public.ml_product_daily_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  item_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  thumbnail text,
  qty_sold integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, item_id)
);

ALTER TABLE public.ml_product_daily_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ml_product_daily_cache" ON public.ml_product_daily_cache FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own ml_product_daily_cache" ON public.ml_product_daily_cache FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own ml_product_daily_cache" ON public.ml_product_daily_cache FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own ml_product_daily_cache" ON public.ml_product_daily_cache FOR DELETE TO authenticated USING (user_id = auth.uid());
