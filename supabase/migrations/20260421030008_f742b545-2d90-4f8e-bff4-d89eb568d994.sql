ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_meta_title text,
  ADD COLUMN IF NOT EXISTS seo_meta_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[],
  ADD COLUMN IF NOT EXISTS seo_generated_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_products_seo_generated_at ON public.products(seo_generated_at);