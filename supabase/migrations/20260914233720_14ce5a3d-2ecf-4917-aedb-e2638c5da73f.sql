-- lovable-cron-fallback-reviewed: 96 runs/day; catalogue summary must reflect admin price/stock edits within 15 minutes, and a full rebuild is too heavy to run per row change during bulk imports
DROP MATERIALIZED VIEW IF EXISTS public.public_catalog_groups;

CREATE MATERIALIZED VIEW public.public_catalog_groups AS
WITH visible AS (
  SELECT p.id, p.name, p.category::text AS category, p.image_url, p.size,
         p.price, p.store_id, lower(btrim(p.name)) AS gkey
  FROM public.products p
  WHERE p.is_hidden = false AND p.in_stock = true
),
grouped AS (
  SELECT v.gkey,
         v.category,
         min(v.price) AS min_price,
         count(*)::int AS store_count,
         (array_agg(v.id ORDER BY v.price ASC NULLS LAST))[1] AS pick_id
  FROM visible v
  GROUP BY v.gkey, v.category
)
SELECT
  g.gkey,
  g.category,
  g.store_count,
  g.min_price,
  p.id,
  p.name,
  p.image_url,
  p.size,
  p.price,
  p.store_id,
  s.name AS store_name,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('pack_size', pp.pack_size, 'price', pp.price) ORDER BY pp.price DESC)
     FROM public.product_pack_prices pp
     WHERE pp.product_id = p.id AND pp.is_hidden = false),
    '[]'::jsonb
  ) AS pack_prices
FROM grouped g
JOIN public.products p ON p.id = g.pick_id
LEFT JOIN public.stores s ON s.id = p.store_id;

CREATE UNIQUE INDEX public_catalog_groups_pk ON public.public_catalog_groups (gkey, category);
CREATE INDEX public_catalog_groups_name_idx ON public.public_catalog_groups (gkey);
CREATE INDEX public_catalog_groups_cat_name_idx ON public.public_catalog_groups (category, gkey);
CREATE INDEX public_catalog_groups_price_idx ON public.public_catalog_groups (min_price);

GRANT SELECT ON public.public_catalog_groups TO anon, authenticated;
GRANT ALL ON public.public_catalog_groups TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_catalog(
  _category text DEFAULT NULL,
  _search text DEFAULT NULL,
  _sort text DEFAULT 'name',
  _limit integer DEFAULT 200,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  name text,
  category text,
  image_url text,
  size text,
  price numeric,
  store_id uuid,
  store_name text,
  store_count integer,
  pack_prices jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.name, c.category, c.image_url, c.size, c.min_price AS price,
         c.store_id, c.store_name, c.store_count, c.pack_prices
  FROM public.public_catalog_groups c
  WHERE (_category IS NULL OR _category = 'all' OR c.category = _category)
    AND (_search IS NULL OR _search = '' OR c.gkey LIKE '%' || lower(btrim(_search)) || '%')
  ORDER BY
    CASE WHEN _sort = 'price-low'  THEN c.min_price END ASC NULLS LAST,
    CASE WHEN _sort = 'price-high' THEN c.min_price END DESC NULLS LAST,
    CASE WHEN _sort NOT IN ('price-low','price-high') THEN c.gkey END ASC
  LIMIT greatest(_limit, 1) OFFSET greatest(_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.refresh_public_catalog_groups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.public_catalog_groups;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_public_catalog_groups() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'refresh-public-catalog-groups',
  '*/15 * * * *',
  $$SELECT public.refresh_public_catalog_groups();$$
);