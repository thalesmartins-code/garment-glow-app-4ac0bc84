-- Drop the restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can read sales data" ON public.sales_data;
DROP POLICY IF EXISTS "Authenticated users can insert sales data" ON public.sales_data;
DROP POLICY IF EXISTS "Authenticated users can update sales data" ON public.sales_data;
DROP POLICY IF EXISTS "Authenticated users can delete sales data" ON public.sales_data;

-- Recreate as permissive policies
CREATE POLICY "Authenticated users can read sales data"
  ON public.sales_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales data"
  ON public.sales_data FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales data"
  ON public.sales_data FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete sales data"
  ON public.sales_data FOR DELETE
  TO authenticated
  USING (true);

-- Also allow anon access for read (in case user isn't logged in)
CREATE POLICY "Anon users can read sales data"
  ON public.sales_data FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert sales data"
  ON public.sales_data FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update sales data"
  ON public.sales_data FOR UPDATE
  TO anon
  USING (true);