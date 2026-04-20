-- Add 'pet_supplies' to product_category enum
ALTER TYPE public.product_category ADD VALUE IF NOT EXISTS 'pet_supplies';