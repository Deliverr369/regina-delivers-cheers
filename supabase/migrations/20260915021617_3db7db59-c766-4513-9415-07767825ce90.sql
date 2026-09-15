-- products
DROP POLICY IF EXISTS "Anyone can view visible products" ON public.products;
CREATE POLICY "Public can view visible products" ON public.products
  FOR SELECT TO anon USING (is_hidden = false);
CREATE POLICY "Users can view visible products" ON public.products
  FOR SELECT TO authenticated
  USING (is_hidden = false OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- product_pack_prices
DROP POLICY IF EXISTS "Anyone can view visible product pack prices" ON public.product_pack_prices;
CREATE POLICY "Public can view visible pack prices" ON public.product_pack_prices
  FOR SELECT TO anon USING (is_hidden = false);
CREATE POLICY "Users can view visible pack prices" ON public.product_pack_prices
  FOR SELECT TO authenticated
  USING (is_hidden = false OR public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can insert product pack prices" ON public.product_pack_prices;
DROP POLICY IF EXISTS "Admins can update product pack prices" ON public.product_pack_prices;
DROP POLICY IF EXISTS "Admins can delete product pack prices" ON public.product_pack_prices;
CREATE POLICY "Admins can insert product pack prices" ON public.product_pack_prices FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update product pack prices" ON public.product_pack_prices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete product pack prices" ON public.product_pack_prices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- blog_posts
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.blog_posts;
CREATE POLICY "Public can view published posts" ON public.blog_posts
  FOR SELECT TO anon
  USING (published = true AND (published_at IS NULL OR published_at <= now()));
CREATE POLICY "Users can view published posts" ON public.blog_posts
  FOR SELECT TO authenticated
  USING ((published = true AND (published_at IS NULL OR published_at <= now()))
         OR public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can insert posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.blog_posts;
CREATE POLICY "Admins can insert posts" ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update posts" ON public.blog_posts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete posts" ON public.blog_posts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- promo_banners
DROP POLICY IF EXISTS "Admins can view all banners" ON public.promo_banners;
DROP POLICY IF EXISTS "Admins can create banners" ON public.promo_banners;
DROP POLICY IF EXISTS "Admins can update banners" ON public.promo_banners;
DROP POLICY IF EXISTS "Admins can delete banners" ON public.promo_banners;
CREATE POLICY "Admins can view all banners" ON public.promo_banners FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create banners" ON public.promo_banners FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update banners" ON public.promo_banners FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete banners" ON public.promo_banners FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- finally, signed-out visitors no longer need the role helper
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;