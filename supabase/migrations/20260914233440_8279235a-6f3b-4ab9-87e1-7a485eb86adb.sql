CREATE INDEX IF NOT EXISTS idx_products_catalog_group
  ON public.products (category, lower(btrim(name)))
  WHERE is_hidden = false AND in_stock = true;

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
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH visible AS (
    SELECT p.id, p.name, p.category::text AS category, p.image_url, p.size,
           p.price, p.store_id, lower(btrim(p.name)) AS gkey
    FROM public.products p
    WHERE p.is_hidden = false
      AND p.in_stock = true
      AND (_category IS NULL OR _category = 'all' OR p.category::text = _category)
      AND (_search IS NULL OR _search = '' OR p.name ILIKE '%' || _search || '%')
  ),
  grouped AS (
    SELECT v.gkey,
           v.category,
           min(v.price) AS min_price,
           count(*)::int AS store_count,
           (array_agg(v.id ORDER BY v.price ASC NULLS LAST))[1] AS pick_id
    FROM visible v
    GROUP BY v.gkey, v.category
  ),
  page AS (
    SELECT * FROM grouped
    ORDER BY
      CASE WHEN _sort = 'price-low'  THEN min_price END ASC NULLS LAST,
      CASE WHEN _sort = 'price-high' THEN min_price END DESC NULLS LAST,
      CASE WHEN _sort NOT IN ('price-low','price-high') THEN gkey END ASC
    LIMIT greatest(_limit, 1) OFFSET greatest(_offset, 0)
  )
  SELECT
    p.id,
    p.name,
    p.category::text,
    p.image_url,
    p.size,
    p.price,
    p.store_id,
    s.name AS store_name,
    g.store_count,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('pack_size', pp.pack_size, 'price', pp.price)
                        ORDER BY pp.price DESC)
       FROM public.product_pack_prices pp
       WHERE pp.product_id = p.id AND pp.is_hidden = false),
      '[]'::jsonb
    ) AS pack_prices
  FROM page g
  JOIN public.products p ON p.id = g.pick_id
  LEFT JOIN public.stores s ON s.id = p.store_id
  ORDER BY
    CASE WHEN _sort = 'price-low'  THEN g.min_price END ASC NULLS LAST,
    CASE WHEN _sort = 'price-high' THEN g.min_price END DESC NULLS LAST,
    CASE WHEN _sort NOT IN ('price-low','price-high') THEN g.gkey END ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_catalog(text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_catalog(text, text, text, integer, integer) TO anon, authenticated;