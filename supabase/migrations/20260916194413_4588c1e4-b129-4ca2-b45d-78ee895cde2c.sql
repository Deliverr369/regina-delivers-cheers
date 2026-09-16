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
SET search_path TO 'public', 'internal'
AS $$
  SELECT c.id, c.name, c.category, c.image_url, c.size, c.min_price AS price,
         c.store_id, c.store_name, c.store_count, c.pack_prices
  FROM internal.public_catalog_groups c
  WHERE (_category IS NULL OR _category = 'all' OR c.category = _category)
    AND (_search IS NULL OR _search = '' OR c.gkey LIKE '%' || lower(btrim(_search)) || '%')
  ORDER BY
    CASE WHEN _sort = 'price-low'  THEN c.min_price END ASC NULLS LAST,
    CASE WHEN _sort = 'price-high' THEN c.min_price END DESC NULLS LAST,
    c.gkey ASC,
    c.category ASC
  LIMIT greatest(_limit, 1) OFFSET greatest(_offset, 0);
$$;