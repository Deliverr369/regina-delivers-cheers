-- =========================================================
-- 1) PROMO CODES: hide table from regular users; expose via SECURITY DEFINER validator
-- =========================================================

DROP POLICY IF EXISTS "Authenticated can view active promo codes" ON public.promo_codes;
-- Admin ALL policy remains intact ("Admins manage promo codes")

-- Validator function: returns only safe fields needed at checkout
CREATE OR REPLACE FUNCTION public.validate_promo_code(_code text, _order_amount numeric)
RETURNS TABLE (
  id uuid,
  code text,
  discount_type text,
  discount_value numeric,
  min_order_amount numeric,
  valid boolean,
  reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.promo_codes%ROWTYPE;
  v_user uuid := auth.uid();
  v_redeemed_count int;
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, _code, NULL::text, NULL::numeric, NULL::numeric, false, 'Sign in required';
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.promo_codes
  WHERE upper(code) = upper(_code)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, _code, NULL::text, NULL::numeric, NULL::numeric, false, 'Invalid code';
    RETURN;
  END IF;

  IF NOT v_row.is_active THEN
    RETURN QUERY SELECT v_row.id, v_row.code, v_row.discount_type, v_row.discount_value, v_row.min_order_amount, false, 'Code not active';
    RETURN;
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at <= now() THEN
    RETURN QUERY SELECT v_row.id, v_row.code, v_row.discount_type, v_row.discount_value, v_row.min_order_amount, false, 'Code expired';
    RETURN;
  END IF;

  IF v_row.max_uses IS NOT NULL AND v_row.use_count >= v_row.max_uses THEN
    RETURN QUERY SELECT v_row.id, v_row.code, v_row.discount_type, v_row.discount_value, v_row.min_order_amount, false, 'Code fully redeemed';
    RETURN;
  END IF;

  IF _order_amount < v_row.min_order_amount THEN
    RETURN QUERY SELECT v_row.id, v_row.code, v_row.discount_type, v_row.discount_value, v_row.min_order_amount, false,
      'Minimum order $' || v_row.min_order_amount::text || ' required';
    RETURN;
  END IF;

  IF v_row.one_per_customer THEN
    SELECT count(*) INTO v_redeemed_count
    FROM public.promo_code_redemptions
    WHERE promo_code_id = v_row.id AND user_id = v_user;
    IF v_redeemed_count > 0 THEN
      RETURN QUERY SELECT v_row.id, v_row.code, v_row.discount_type, v_row.discount_value, v_row.min_order_amount, false, 'Already used';
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT v_row.id, v_row.code, v_row.discount_type, v_row.discount_value, v_row.min_order_amount, true, 'OK';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO authenticated;

-- =========================================================
-- 2) STORAGE: store-images bucket — block listing, keep object reads
-- =========================================================

-- Drop any broad SELECT policy that allows listing the bucket contents
DROP POLICY IF EXISTS "Public can view store images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view store images" ON storage.objects;
DROP POLICY IF EXISTS "store-images public read" ON storage.objects;
DROP POLICY IF EXISTS "Public read store-images" ON storage.objects;

-- Public bucket means objects are still served via public URLs at the CDN edge
-- without needing a SELECT policy. We intentionally do NOT add a SELECT policy
-- so that authenticated/anon clients cannot enumerate (list) the bucket via the
-- Storage API. Admins can still upload/manage via existing admin policies.

-- Ensure admin manage policy exists for store-images
DROP POLICY IF EXISTS "Admins manage store-images" ON storage.objects;
CREATE POLICY "Admins manage store-images"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 3) SECURITY DEFINER FUNCTIONS: revoke broad EXECUTE
-- =========================================================

-- These are internal helpers (triggers, server-side use) and should not be
-- callable by anon/authenticated through the PostgREST API.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_send_push() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_order_store_id() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM public, anon, authenticated;

-- has_role IS used inside RLS policies, which run as the policy owner regardless
-- of grants — so revoking from authenticated/anon is safe and prevents direct
-- enumeration via the API.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public, anon, authenticated;