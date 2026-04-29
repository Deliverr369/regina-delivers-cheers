ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS slug TEXT;

-- Auto-fill slugs for existing rows
UPDATE public.stores
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);