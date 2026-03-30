
CREATE TABLE public.shopee_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id text NOT NULL,
  order_status text NOT NULL DEFAULT '',
  order_date date NOT NULL,
  sku text NOT NULL DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  variation text NOT NULL DEFAULT '',
  agreed_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_id, sku, variation)
);

ALTER TABLE public.shopee_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own shopee_orders" ON public.shopee_orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins and editors can insert shopee_orders" ON public.shopee_orders FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'editor'::app_role]));
CREATE POLICY "Admins and editors can update shopee_orders" ON public.shopee_orders FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'editor'::app_role]));
CREATE POLICY "Admins and editors can delete shopee_orders" ON public.shopee_orders FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'editor'::app_role]));
