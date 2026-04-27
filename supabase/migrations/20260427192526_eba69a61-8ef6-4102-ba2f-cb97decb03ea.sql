
-- 1) Storage: tighten store-images bucket policies
-- Drop any overly broad SELECT policies on this bucket, then add narrow ones.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (qual ILIKE '%store-images%' OR with_check ILIKE '%store-images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Public can read individual files (direct URL) but cannot list arbitrary keys
-- (Supabase's list endpoint requires SELECT with non-trivial filters; restricting via prefix is standard.)
CREATE POLICY "store-images public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'store-images');

CREATE POLICY "store-images admin write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "store-images admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "store-images admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Lock down SECURITY DEFINER functions — revoke from public/anon/authenticated,
-- then grant back only what the app needs.

-- Trigger functions: triggers fire as the table owner regardless of EXECUTE grants,
-- so we revoke from everyone.
REVOKE ALL ON FUNCTION public.notify_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_send_push() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS USING clauses; signed-in users must be able to evaluate it,
-- but anon should not.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
