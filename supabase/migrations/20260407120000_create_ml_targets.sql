-- Metas mensais por loja/marketplace
CREATE TABLE IF NOT EXISTS public.ml_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id text NOT NULL,          -- gerado: {sellerId}-{marketplaceId}-{year}-{month}
  seller_id text NOT NULL,          -- ML user ID (ml_user_id)
  marketplace_id text NOT NULL DEFAULT 'mercado-livre',
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  target_value numeric NOT NULL DEFAULT 0,
  kpi_targets jsonb,                -- { revenue, orders, ticket, conversion }
  pmt_distribution jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ml_targets_unique UNIQUE (user_id, seller_id, marketplace_id, year, month)
);

ALTER TABLE public.ml_targets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ml_targets_user_id_idx ON public.ml_targets (user_id);

CREATE POLICY "Users can select own ml_targets"
  ON public.ml_targets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ml_targets"
  ON public.ml_targets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ml_targets"
  ON public.ml_targets FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ml_targets"
  ON public.ml_targets FOR DELETE TO authenticated
  USING (user_id = auth.uid());
