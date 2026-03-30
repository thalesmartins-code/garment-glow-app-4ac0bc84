
CREATE TABLE public.shopee_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  hour smallint, -- NULL for monthly/daily rows, 0-23 for hourly rows
  revenue numeric NOT NULL DEFAULT 0,
  revenue_without_discounts numeric NOT NULL DEFAULT 0,
  orders integer NOT NULL DEFAULT 0,
  avg_order_value numeric NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  visitors integer NOT NULL DEFAULT 0,
  conversion_rate numeric NOT NULL DEFAULT 0,
  cancelled_orders integer NOT NULL DEFAULT 0,
  cancelled_revenue numeric NOT NULL DEFAULT 0,
  returned_orders integer NOT NULL DEFAULT 0,
  returned_revenue numeric NOT NULL DEFAULT 0,
  buyers integer NOT NULL DEFAULT 0,
  new_buyers integer NOT NULL DEFAULT 0,
  existing_buyers integer NOT NULL DEFAULT 0,
  potential_buyers integer NOT NULL DEFAULT 0,
  repeat_purchase_rate numeric NOT NULL DEFAULT 0,
  imported_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, hour)
);

-- RLS
ALTER TABLE public.shopee_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own shopee_sales"
  ON public.shopee_sales FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins and editors can insert shopee_sales"
  ON public.shopee_sales FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'editor'::app_role]));

CREATE POLICY "Admins and editors can update shopee_sales"
  ON public.shopee_sales FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'editor'::app_role]));

CREATE POLICY "Admins and editors can delete shopee_sales"
  ON public.shopee_sales FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'editor'::app_role]));
