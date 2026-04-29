ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS substituted_name text,
  ADD COLUMN IF NOT EXISTS store_note text;

-- Allow admins to update item-level substitutions / notes
DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;
CREATE POLICY "Admins can update order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));