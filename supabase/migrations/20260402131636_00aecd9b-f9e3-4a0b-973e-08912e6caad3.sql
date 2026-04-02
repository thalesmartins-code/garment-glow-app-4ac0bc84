
-- Add seller_id to ml_tokens
ALTER TABLE public.ml_tokens
ADD COLUMN seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Add seller_id to ml_user_cache
ALTER TABLE public.ml_user_cache
ADD COLUMN seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Add seller_id to ml_daily_cache
ALTER TABLE public.ml_daily_cache
ADD COLUMN seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Add seller_id to ml_hourly_cache
ALTER TABLE public.ml_hourly_cache
ADD COLUMN seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Add seller_id to ml_product_daily_cache
ALTER TABLE public.ml_product_daily_cache
ADD COLUMN seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Add seller_id to ml_sync_log
ALTER TABLE public.ml_sync_log
ADD COLUMN seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_ml_tokens_seller_id ON public.ml_tokens(seller_id);
CREATE INDEX idx_ml_user_cache_seller_id ON public.ml_user_cache(seller_id);
CREATE INDEX idx_ml_daily_cache_seller_id ON public.ml_daily_cache(seller_id);
CREATE INDEX idx_ml_hourly_cache_seller_id ON public.ml_hourly_cache(seller_id);
CREATE INDEX idx_ml_product_daily_cache_seller_id ON public.ml_product_daily_cache(seller_id);
CREATE INDEX idx_ml_sync_log_seller_id ON public.ml_sync_log(seller_id);
