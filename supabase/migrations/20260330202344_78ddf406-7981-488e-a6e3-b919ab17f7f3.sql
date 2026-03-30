
-- Delete all pack prices first (foreign key dependency)
DELETE FROM product_pack_prices;

-- Delete all products from all stores
DELETE FROM products;
