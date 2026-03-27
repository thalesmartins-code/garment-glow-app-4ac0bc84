-- Drop old unique index that doesn't include ml_user_id
DROP INDEX IF EXISTS public.ml_hourly_cache_user_date_hour_idx;

-- Fix existing hourly rows with empty ml_user_id by copying from ml_tokens
UPDATE public.ml_hourly_cache h
SET ml_user_id = t.ml_user_id
FROM public.ml_tokens t
WHERE h.user_id = t.user_id
  AND (h.ml_user_id IS NULL OR h.ml_user_id = '')
  AND t.ml_user_id IS NOT NULL;