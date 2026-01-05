-- Add is_hidden column to product_pack_prices to allow hiding specific sizes per product
ALTER TABLE public.product_pack_prices 
ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;