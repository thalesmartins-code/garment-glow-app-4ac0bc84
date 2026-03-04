
-- Drop existing overly permissive policies on sales_data
DROP POLICY "Authenticated users can insert sales data" ON public.sales_data;
DROP POLICY "Authenticated users can update sales data" ON public.sales_data;
DROP POLICY "Authenticated users can delete sales data" ON public.sales_data;

-- Recreate INSERT, UPDATE, DELETE restricted to admin and editor roles
CREATE POLICY "Admins and editors can insert sales data"
ON public.sales_data FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('admin', 'editor')
);

CREATE POLICY "Admins and editors can update sales data"
ON public.sales_data FOR UPDATE TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('admin', 'editor')
);

CREATE POLICY "Admins and editors can delete sales data"
ON public.sales_data FOR DELETE TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('admin', 'editor')
);
