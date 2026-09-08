DROP POLICY "Anyone can view visible products" ON public.products;
CREATE POLICY "Anyone can view visible products" ON public.products
FOR SELECT USING (is_hidden = false OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

CREATE INDEX IF NOT EXISTS idx_products_visible_store ON public.products (store_id) WHERE is_hidden = false AND in_stock = true;