-- has_role is used INSIDE RLS policies; PostgREST evaluates these expressions
-- as the calling role. Re-grant EXECUTE so policies work again.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;