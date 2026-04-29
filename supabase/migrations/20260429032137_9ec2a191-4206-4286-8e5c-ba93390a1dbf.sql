-- has_role: used by RLS internally; no API caller should execute it directly
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- validate_promo_code: intentionally called by signed-in users at checkout; remove anon/public access
REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO authenticated;