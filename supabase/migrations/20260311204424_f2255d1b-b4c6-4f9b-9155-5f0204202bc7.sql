-- RLS policies for ml_tokens
ALTER TABLE public.ml_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ml_tokens"
ON public.ml_tokens FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ml_tokens"
ON public.ml_tokens FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own ml_tokens"
ON public.ml_tokens FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own ml_tokens"
ON public.ml_tokens FOR UPDATE
TO authenticated
USING (user_id = auth.uid());