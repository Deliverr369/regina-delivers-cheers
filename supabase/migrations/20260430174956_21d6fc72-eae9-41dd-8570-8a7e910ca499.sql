CREATE OR REPLACE FUNCTION public.get_seo_stats()
RETURNS TABLE(total bigint, with_seo bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.products),
    (SELECT count(*) FROM public.products WHERE seo_generated_at IS NOT NULL)
  WHERE public.has_role(auth.uid(), 'admin'::app_role);
$$;

GRANT EXECUTE ON FUNCTION public.get_seo_stats() TO authenticated;