-- Add foreign key so PostgREST can embed pack prices in product queries
ALTER TABLE public.product_pack_prices
  ADD CONSTRAINT product_pack_prices_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Indexes to speed up store-detail page load
CREATE INDEX IF NOT EXISTS idx_product_pack_prices_product_id
  ON public.product_pack_prices(product_id);

CREATE INDEX IF NOT EXISTS idx_products_store_in_stock
  ON public.products(store_id, in_stock)
  WHERE in_stock = true;