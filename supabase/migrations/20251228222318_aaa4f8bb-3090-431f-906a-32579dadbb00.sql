-- Add size and is_hidden columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS size text,
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

-- Create RLS policies for admin to manage products
CREATE POLICY "Admins can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products" 
ON public.products 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products" 
ON public.products 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Update the select policy to exclude hidden products for non-admins
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;

CREATE POLICY "Anyone can view visible products" 
ON public.products 
FOR SELECT 
USING (is_hidden = false OR has_role(auth.uid(), 'admin'));