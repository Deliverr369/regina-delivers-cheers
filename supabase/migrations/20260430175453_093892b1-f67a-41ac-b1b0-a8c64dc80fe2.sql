-- Indexes to speed up grouping & recent queries
CREATE INDEX IF NOT EXISTS products_name_category_idx
  ON public.products (lower(name), category);

CREATE INDEX IF NOT EXISTS products_seo_generated_at_idx
  ON public.products (seo_generated_at) WHERE seo_generated_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_created_at_desc_idx
  ON public.orders (created_at DESC);

CREATE INDEX IF NOT EXISTS pack_prices_product_id_idx
  ON public.product_pack_prices (product_id);

-- ============================================================
-- Catalog groups (lightweight — for /dashboard/products grid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_product_catalog_groups()
RETURNS TABLE(
  name text,
  category text,
  image_url text,
  description text,
  store_count integer,
  variant_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pp_counts AS (
    SELECT product_id, COUNT(*)::int AS c
    FROM public.product_pack_prices
    GROUP BY product_id
  )
  SELECT
    (array_agg(p.name ORDER BY p.created_at))[1]                         AS name,
    p.category::text                                                      AS category,
    (array_agg(p.image_url) FILTER (WHERE p.image_url IS NOT NULL))[1]    AS image_url,
    (array_agg(p.description) FILTER (WHERE p.description IS NOT NULL))[1] AS description,
    COUNT(*)::int                                                         AS store_count,
    COALESCE(MAX(pp.c), 0)::int                                           AS variant_count
  FROM public.products p
  LEFT JOIN pp_counts pp ON pp.product_id = p.id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  GROUP BY lower(trim(p.name)), p.category
  ORDER BY (array_agg(p.name ORDER BY p.created_at))[1];
$$;

GRANT EXECUTE ON FUNCTION public.get_product_catalog_groups() TO authenticated;

-- ============================================================
-- Inventory groups (richer — for /dashboard/inventory)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_inventory_overview()
RETURNS TABLE(
  group_key text,
  name text,
  category text,
  description text,
  image_url text,
  store_count integer,
  variant_count integer,
  has_image boolean,
  has_pricing boolean,
  in_stock boolean,
  is_visible boolean,
  last_updated timestamptz,
  price_min numeric,
  price_max numeric,
  product_ids uuid[],
  store_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pp_agg AS (
    SELECT product_id,
           COUNT(*)::int AS c,
           MIN(CASE WHEN is_hidden = false THEN price END) AS p_min,
           MAX(CASE WHEN is_hidden = false THEN price END) AS p_max
    FROM public.product_pack_prices
    GROUP BY product_id
  )
  SELECT
    lower(trim(p.name)) || '::' || p.category::text                       AS group_key,
    (array_agg(p.name ORDER BY p.created_at))[1]                          AS name,
    p.category::text                                                       AS category,
    (array_agg(p.description) FILTER (WHERE p.description IS NOT NULL))[1] AS description,
    (array_agg(p.image_url) FILTER (WHERE p.image_url IS NOT NULL))[1]    AS image_url,
    COUNT(*)::int                                                          AS store_count,
    COALESCE(MAX(pp.c), 0)::int                                            AS variant_count,
    bool_or(p.image_url IS NOT NULL)                                       AS has_image,
    bool_or(pp.c > 0)                                                      AS has_pricing,
    bool_or(p.in_stock IS TRUE)                                            AS in_stock,
    bool_or(p.is_hidden IS NOT TRUE)                                       AS is_visible,
    MAX(p.created_at)                                                      AS last_updated,
    MIN(pp.p_min)                                                          AS price_min,
    MAX(pp.p_max)                                                          AS price_max,
    array_agg(p.id)                                                        AS product_ids,
    array_agg(DISTINCT p.store_id)                                         AS store_ids
  FROM public.products p
  LEFT JOIN pp_agg pp ON pp.product_id = p.id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  GROUP BY lower(trim(p.name)), p.category
  ORDER BY (array_agg(p.name ORDER BY p.created_at))[1];
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_overview() TO authenticated;

-- ============================================================
-- Dashboard overview (totals + daily series + status + recent)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_overview(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => _days);
  v_totals jsonb;
  v_daily jsonb;
  v_status jsonb;
  v_recent jsonb;
  v_users int;
  v_stores int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT count(*) INTO v_users FROM public.profiles;
  SELECT count(*) INTO v_stores FROM public.stores;

  SELECT jsonb_build_object(
    'orders', COALESCE(count(*), 0),
    'revenue', COALESCE(sum(total), 0),
    'pending', COALESCE(sum(CASE WHEN status::text = 'pending' THEN 1 ELSE 0 END), 0)
  )
  INTO v_totals
  FROM public.orders
  WHERE created_at >= v_since;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', d.day,
    'orders', d.orders,
    'revenue', d.revenue
  ) ORDER BY d.day), '[]'::jsonb)
  INTO v_daily
  FROM (
    SELECT date_trunc('day', created_at)::date AS day,
           count(*) AS orders,
           sum(total)::numeric AS revenue
    FROM public.orders
    WHERE created_at >= v_since
    GROUP BY 1
  ) d;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'count', n)), '[]'::jsonb)
  INTO v_status
  FROM (
    SELECT COALESCE(status::text, 'pending') AS status, count(*)::int AS n
    FROM public.orders
    WHERE created_at >= v_since
    GROUP BY 1
  ) s;

  SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
  INTO v_recent
  FROM (
    SELECT id, total, status, created_at, delivery_address
    FROM public.orders
    WHERE created_at >= v_since
    ORDER BY created_at DESC
    LIMIT 5
  ) r;

  RETURN jsonb_build_object(
    'users', v_users,
    'stores', v_stores,
    'totals', v_totals,
    'daily', v_daily,
    'status', v_status,
    'recent', v_recent
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_overview(integer) TO authenticated;