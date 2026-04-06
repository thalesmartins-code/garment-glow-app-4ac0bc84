
-- Cache diário de métricas de ADS do Mercado Livre
CREATE TABLE public.ml_ads_daily_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  ml_user_id text NOT NULL DEFAULT '',
  seller_id uuid REFERENCES public.sellers(id) ON DELETE CASCADE,
  date date NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  spend numeric NOT NULL DEFAULT 0,
  attributed_revenue numeric NOT NULL DEFAULT 0,
  attributed_orders integer NOT NULL DEFAULT 0,
  cpc numeric NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  roas numeric NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ml_ads_daily_cache_unique UNIQUE (user_id, ml_user_id, date)
);

ALTER TABLE public.ml_ads_daily_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ml_ads_daily_cache"
  ON public.ml_ads_daily_cache FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ml_ads_daily_cache"
  ON public.ml_ads_daily_cache FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ml_ads_daily_cache"
  ON public.ml_ads_daily_cache FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ml_ads_daily_cache"
  ON public.ml_ads_daily_cache FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Cache de campanhas de ADS
CREATE TABLE public.ml_ads_campaigns_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  ml_user_id text NOT NULL DEFAULT '',
  seller_id uuid REFERENCES public.sellers(id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  daily_budget numeric NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  spend numeric NOT NULL DEFAULT 0,
  attributed_revenue numeric NOT NULL DEFAULT 0,
  attributed_orders integer NOT NULL DEFAULT 0,
  cpc numeric NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  roas numeric NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ml_ads_campaigns_cache_unique UNIQUE (user_id, ml_user_id, campaign_id)
);

ALTER TABLE public.ml_ads_campaigns_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ml_ads_campaigns_cache"
  ON public.ml_ads_campaigns_cache FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ml_ads_campaigns_cache"
  ON public.ml_ads_campaigns_cache FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ml_ads_campaigns_cache"
  ON public.ml_ads_campaigns_cache FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ml_ads_campaigns_cache"
  ON public.ml_ads_campaigns_cache FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Cache de produtos anunciados
CREATE TABLE public.ml_ads_products_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  ml_user_id text NOT NULL DEFAULT '',
  seller_id uuid REFERENCES public.sellers(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  thumbnail text,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  spend numeric NOT NULL DEFAULT 0,
  attributed_revenue numeric NOT NULL DEFAULT 0,
  attributed_orders integer NOT NULL DEFAULT 0,
  cpc numeric NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  roas numeric NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ml_ads_products_cache_unique UNIQUE (user_id, ml_user_id, item_id)
);

ALTER TABLE public.ml_ads_products_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ml_ads_products_cache"
  ON public.ml_ads_products_cache FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ml_ads_products_cache"
  ON public.ml_ads_products_cache FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ml_ads_products_cache"
  ON public.ml_ads_products_cache FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ml_ads_products_cache"
  ON public.ml_ads_products_cache FOR DELETE TO authenticated
  USING (user_id = auth.uid());
