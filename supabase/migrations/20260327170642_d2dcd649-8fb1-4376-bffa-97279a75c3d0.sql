
CREATE TABLE public.ml_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ml_user_id text NOT NULL DEFAULT '',
  date_from date NOT NULL,
  date_to date NOT NULL,
  days_synced integer NOT NULL DEFAULT 0,
  orders_fetched integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'auto',
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ml_user_id, date_from, date_to, source)
);

ALTER TABLE public.ml_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ml_sync_log" ON public.ml_sync_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own ml_sync_log" ON public.ml_sync_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own ml_sync_log" ON public.ml_sync_log FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own ml_sync_log" ON public.ml_sync_log FOR DELETE TO authenticated USING (user_id = auth.uid());
