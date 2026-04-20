ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory text;
CREATE INDEX IF NOT EXISTS idx_products_store_subcategory ON public.products(store_id, subcategory);