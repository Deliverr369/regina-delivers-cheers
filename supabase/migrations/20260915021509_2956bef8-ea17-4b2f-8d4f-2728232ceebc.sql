-- 1. Hidden pack prices must not be publicly readable
DROP POLICY IF EXISTS "Anyone can view product pack prices" ON public.product_pack_prices;
CREATE POLICY "Anyone can view visible product pack prices"
  ON public.product_pack_prices
  FOR SELECT
  USING (is_hidden = false OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Revoke public EXECUTE on SECURITY DEFINER routines that anon never needs.
--    (has_role stays executable because RLS policies evaluated as anon call it.)
REVOKE EXECUTE ON FUNCTION public.enforce_single_default_address() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.ensure_order_store_id() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_store_hours() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trigger_send_push() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO authenticated;

-- 3. Server-side age attestation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.confirm_age_19_plus()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ts timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required to confirm age';
  END IF;

  UPDATE public.profiles
     SET age_verified_at = COALESCE(age_verified_at, now())
   WHERE id = v_uid
  RETURNING age_verified_at INTO v_ts;

  RETURN v_ts;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_age_19_plus() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.confirm_age_19_plus() TO authenticated;

-- Existing customers who already ordered keep working
UPDATE public.profiles p
   SET age_verified_at = now()
 WHERE p.age_verified_at IS NULL
   AND EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id = p.id);

CREATE OR REPLACE FUNCTION public.enforce_age_verified_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.user_id AND age_verified_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Age verification (19+) is required before placing an order';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_age_verified_on_order() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS enforce_age_verified_on_order_bi ON public.orders;
CREATE TRIGGER enforce_age_verified_on_order_bi
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_age_verified_on_order();