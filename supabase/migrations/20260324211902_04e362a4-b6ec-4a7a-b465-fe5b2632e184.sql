
-- Admin can view all orders
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can update all orders
CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can view all order items
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can manage stores (insert, delete)
CREATE POLICY "Admins can insert stores" ON public.stores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete stores" ON public.stores FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
