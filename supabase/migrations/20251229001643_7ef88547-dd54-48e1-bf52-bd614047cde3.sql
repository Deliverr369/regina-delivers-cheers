-- Rename beer_pack_prices to product_pack_prices for generic use
ALTER TABLE public.beer_pack_prices RENAME TO product_pack_prices;

-- Update RLS policy names to reflect the new table name
ALTER POLICY "Anyone can view beer pack prices" ON public.product_pack_prices RENAME TO "Anyone can view product pack prices";
ALTER POLICY "Admins can insert beer pack prices" ON public.product_pack_prices RENAME TO "Admins can insert product pack prices";
ALTER POLICY "Admins can update beer pack prices" ON public.product_pack_prices RENAME TO "Admins can update product pack prices";
ALTER POLICY "Admins can delete beer pack prices" ON public.product_pack_prices RENAME TO "Admins can delete product pack prices";