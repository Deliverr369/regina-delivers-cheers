UPDATE product_pack_prices 
SET price = 0, updated_at = now()
WHERE product_id IN (
  SELECT id FROM products WHERE category = 'beer'
);

-- Also update the base products.price to 0 (no updated_at column on products)
UPDATE products 
SET price = 0
WHERE category = 'beer';