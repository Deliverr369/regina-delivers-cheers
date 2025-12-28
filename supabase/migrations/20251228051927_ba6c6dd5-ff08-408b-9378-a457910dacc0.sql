-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Regina',
  postal_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stores table
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  delivery_time TEXT DEFAULT '30-45 min',
  delivery_fee DECIMAL(5,2) DEFAULT 0,
  is_open BOOLEAN DEFAULT true,
  hours TEXT DEFAULT '10:00 AM - 10:00 PM',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product categories enum
CREATE TYPE public.product_category AS ENUM ('beer', 'wine', 'spirits', 'smokes');

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category product_category NOT NULL,
  image_url TEXT,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  status order_status DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(5,2) DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_city TEXT DEFAULT 'Regina',
  delivery_postal_code TEXT,
  delivery_instructions TEXT,
  payment_method TEXT DEFAULT 'card',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies: users can read and update their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Stores policies: everyone can read stores
CREATE POLICY "Anyone can view stores"
ON public.stores FOR SELECT
TO authenticated, anon
USING (true);

-- Products policies: everyone can read products
CREATE POLICY "Anyone can view products"
ON public.products FOR SELECT
TO authenticated, anon
USING (true);

-- Orders policies: users can only see and create their own orders
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
ON public.orders FOR UPDATE
USING (auth.uid() = user_id);

-- Order items policies: users can view and create items for their own orders
CREATE POLICY "Users can view their own order items"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create order items for their own orders"
ON public.order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample stores
INSERT INTO public.stores (name, address, phone, rating, reviews_count, delivery_time, delivery_fee, is_open, image_url) VALUES
('Regina Liquor World', '2341 Victoria Ave E, Regina', '(306) 555-0123', 4.8, 234, '25-35 min', 0, true, 'https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=500&auto=format'),
('Warehouse Spirits', '1955 11th Ave, Regina', '(306) 555-0456', 4.6, 189, '30-40 min', 2.99, true, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&auto=format'),
('Crown & Cork', '4501 Gordon Rd, Regina', '(306) 555-0789', 4.9, 312, '35-45 min', 0, true, 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=500&auto=format'),
('The Liquor Barn', '789 Albert St, Regina', '(306) 555-1011', 4.5, 156, '20-30 min', 1.99, true, 'https://images.unsplash.com/photo-1574015974293-817f0ebebb74?w=500&auto=format'),
('Prairie Wines & Spirits', '1234 Broad St, Regina', '(306) 555-1213', 4.7, 203, '30-40 min', 0, false, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500&auto=format'),
('Capital City Liquor', '567 Rochdale Blvd, Regina', '(306) 555-1415', 4.4, 98, '25-35 min', 2.49, true, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500&auto=format');

-- Insert sample products
INSERT INTO public.products (store_id, name, price, category, image_url) 
SELECT s.id, 'Budweiser 24 Pack', 42.99, 'beer', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&auto=format'
FROM public.stores s WHERE s.name = 'Regina Liquor World';

INSERT INTO public.products (store_id, name, price, category, image_url) 
SELECT s.id, 'Kokanee 15 Pack', 28.99, 'beer', 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&auto=format'
FROM public.stores s WHERE s.name = 'Regina Liquor World';

INSERT INTO public.products (store_id, name, price, category, image_url) 
SELECT s.id, 'Corona Extra 12 Pack', 24.99, 'beer', 'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=300&auto=format'
FROM public.stores s WHERE s.name = 'Warehouse Spirits';

INSERT INTO public.products (store_id, name, price, category, image_url) 
SELECT s.id, 'Heineken 12 Pack', 26.99, 'beer', 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=300&auto=format'
FROM public.stores s WHERE s.name = 'Crown & Cork';

INSERT INTO public.products (store_id, name, price, category, image_url) 
SELECT s.id, 'Barefoot Cabernet Sauvignon', 12.99, 'wine', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format'
FROM public.stores s WHERE s.name = 'Crown & Cork';

INSERT INTO public.products (store_id, name, price, category, image_url) 
SELECT s.id, 'Yellow Tail Chardonnay', 11.99, 'wine', 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=300&auto=format'
FROM public.stores s WHERE s.name = 'Regina Liquor World';

INSERT INTO public.products (store_id, name, price, category, image_url) 
SELECT s.id, 'Smirnoff Vodka 750ml', 24.99, 'spirits', 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format'
FROM public.stores s WHERE s.name = 'Regina Liquor World';

INSERT INTO public.products (store_id, name, price, category, image_url) 
SELECT s.id, 'Jack Daniels 750ml', 34.99, 'spirits', 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format'
FROM public.stores s WHERE s.name = 'Warehouse Spirits';

INSERT INTO public.products (store_id, name, price, category, image_url) 
SELECT s.id, 'Captain Morgan Spiced Rum 750ml', 28.99, 'spirits', 'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=300&auto=format'
FROM public.stores s WHERE s.name = 'Crown & Cork';

INSERT INTO public.products (store_id, name, price, category, image_url) 
SELECT s.id, 'Marlboro Red King Size', 18.99, 'smokes', 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=300&auto=format'
FROM public.stores s WHERE s.name = 'Regina Liquor World';

INSERT INTO public.products (store_id, name, price, category, image_url) 
SELECT s.id, 'Canadian Classic Blue', 16.99, 'smokes', 'https://images.unsplash.com/photo-1551524164-687a55dd1126?w=300&auto=format'
FROM public.stores s WHERE s.name = 'Warehouse Spirits';