
-- Step 1: Drop the existing unique constraint on ml_user_cache (user_id only)
-- and add a new one on (user_id, ml_user_id) for multi-store support
ALTER TABLE public.ml_user_cache DROP CONSTRAINT IF EXISTS ml_user_cache_user_id_key;
ALTER TABLE public.ml_user_cache DROP CONSTRAINT IF EXISTS ml_user_cache_pkey;
ALTER TABLE public.ml_user_cache ADD PRIMARY KEY (user_id, ml_user_id);

-- Step 2: Add unique constraint on ml_tokens for (user_id, ml_user_id) upserts
CREATE UNIQUE INDEX IF NOT EXISTS ml_tokens_user_ml_user_unique ON public.ml_tokens (user_id, ml_user_id);
