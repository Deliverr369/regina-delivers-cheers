-- =========================================================================
-- 1. REVOKE blanket privileges from anon/authenticated on all public tables.
--    (Supabase grants ALL by default; RLS gates it, but defense-in-depth
--    means we should not rely on RLS being the only barrier.)
-- =========================================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- =========================================================================
-- 2. Re-grant the MINIMUM needed for each table.
-- =========================================================================

-- Public catalog: anon + authenticated can SELECT only
GRANT SELECT ON public.stores              TO anon, authenticated;
GRANT SELECT ON public.products            TO anon, authenticated;
GRANT SELECT ON public.product_pack_prices TO anon, authenticated;
GRANT SELECT ON public.promo_banners       TO anon, authenticated;
GRANT SELECT ON public.blog_posts          TO anon, authenticated;

-- Customer-owned tables: SELECT + write only for authenticated, gated by RLS
GRANT SELECT, INSERT, UPDATE         ON public.profiles                TO authenticated;
GRANT SELECT, INSERT                 ON public.orders                  TO authenticated;
GRANT SELECT, INSERT                 ON public.order_items             TO authenticated;
GRANT SELECT                         ON public.order_price_adjustments TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.favorites               TO authenticated;
GRANT SELECT, UPDATE                 ON public.notifications           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens           TO authenticated;
GRANT SELECT, INSERT                 ON public.promo_code_redemptions  TO authenticated;
GRANT SELECT                         ON public.customer_billing        TO authenticated;
GRANT SELECT                         ON public.user_roles              TO authenticated;

-- Admin-managed tables: authenticated needs base privileges so RLS admin
-- policies can actually allow the operation.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_image_jobs   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_match_jobs  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_drafts     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_sessions   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_banners     TO authenticated;
GRANT INSERT, UPDATE, DELETE         ON public.blog_posts        TO authenticated;
GRANT INSERT, UPDATE, DELETE         ON public.products          TO authenticated;
GRANT INSERT, UPDATE, DELETE         ON public.product_pack_prices TO authenticated;
GRANT INSERT, UPDATE, DELETE         ON public.stores            TO authenticated;
GRANT INSERT, UPDATE, DELETE         ON public.user_roles        TO authenticated;
GRANT UPDATE                         ON public.orders            TO authenticated;
GRANT INSERT, UPDATE, DELETE         ON public.order_price_adjustments TO authenticated;
GRANT SELECT                         ON public.notifications     TO authenticated; -- already granted above
GRANT SELECT                         ON public.device_tokens     TO authenticated;

-- Sequences: authenticated needs USAGE for INSERTs that use serial/identity
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =========================================================================
-- 3. Tighten RLS policies that target `public` role -> require `authenticated`
--    (anonymous users should never be able to even attempt these actions)
-- =========================================================================

-- favorites
DROP POLICY IF EXISTS "Users add own favorites"     ON public.favorites;
DROP POLICY IF EXISTS "Users remove own favorites"  ON public.favorites;
DROP POLICY IF EXISTS "Users view own favorites"    ON public.favorites;
CREATE POLICY "Users add own favorites"    ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own favorites" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users view own favorites"   ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications"   ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own notifications"   ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- device_tokens
DROP POLICY IF EXISTS "Users delete own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users insert own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users update own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users view own device tokens"   ON public.device_tokens;
CREATE POLICY "Users delete own device tokens" ON public.device_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own device tokens" ON public.device_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own device tokens" ON public.device_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own device tokens"   ON public.device_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- orders
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders"   ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own orders"   ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- order_items
DROP POLICY IF EXISTS "Users can create order items for their own orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items"              ON public.order_items;
CREATE POLICY "Users can create order items for their own orders" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can view their own order items"              ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- promo_code_redemptions
DROP POLICY IF EXISTS "Users create own redemptions" ON public.promo_code_redemptions;
DROP POLICY IF EXISTS "Users view own redemptions"   ON public.promo_code_redemptions;
CREATE POLICY "Users create own redemptions" ON public.promo_code_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own redemptions"   ON public.promo_code_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- products / product_pack_prices / promo_banners / blog_posts admin policies:
-- they target `public` role today which still works since we kept admin checks
-- via has_role(); leave SELECT-anyone policies alone (they intentionally allow anon).

-- =========================================================================
-- 4. Default privileges so future tables don't get the same wide grants
-- =========================================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;