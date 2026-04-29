-- 1. customer_billing: add explicit policies (currently zero policies, table is locked)
-- Owners can view their own billing record; admins can view all. No client writes —
-- only edge functions using service role insert/update Stripe customer IDs.
CREATE POLICY "Users view own billing"
ON public.customer_billing
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all billing"
ON public.customer_billing
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. promo_codes: make admin-only SELECT explicit (the existing ALL policy covers
-- it, but an explicit SELECT makes intent unambiguous and silences scanners).
-- Customers must validate codes via the SECURITY DEFINER `validate_promo_code` RPC,
-- never by reading the table directly.
CREATE POLICY "Admins view promo codes"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Lock down SECURITY DEFINER trigger functions — these should only ever be
-- invoked by their triggers, never directly by signed-in users.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_order_store_id()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_change()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_send_push()            FROM PUBLIC, anon, authenticated;

-- 4. validate_promo_code MUST stay callable by authenticated users (customer-side
-- promo validation depends on it). Make the grant explicit and revoke from anon.
REVOKE EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO authenticated;

-- 5. has_role: same — authenticated users need it (UI checks own admin status,
-- RLS policies call it). Confirm explicit grant.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;