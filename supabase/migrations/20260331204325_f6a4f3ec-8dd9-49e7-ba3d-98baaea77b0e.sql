
-- Remove exact duplicate products (same name, store_id, category), keeping the oldest record.
-- First, migrate any unique pack prices from duplicates to the keeper.
WITH dupes AS (
  SELECT id, name, store_id, category, created_at,
    ROW_NUMBER() OVER (PARTITION BY lower(trim(name)), store_id, category ORDER BY created_at ASC) as rn
  FROM products
),
keepers AS (
  SELECT id as keep_id, lower(trim(name)) as lname, store_id, category
  FROM dupes WHERE rn = 1
),
to_delete AS (
  SELECT d.id as del_id, k.keep_id
  FROM dupes d
  JOIN keepers k ON lower(trim(d.name)) = k.lname AND d.store_id = k.store_id AND d.category = k.category
  WHERE d.rn > 1
),
-- Migrate unique pack prices from duplicates to keepers
migrate_packs AS (
  INSERT INTO product_pack_prices (product_id, pack_size, price, is_hidden)
  SELECT DISTINCT td.keep_id, pp.pack_size, pp.price, pp.is_hidden
  FROM to_delete td
  JOIN product_pack_prices pp ON pp.product_id = td.del_id
  WHERE NOT EXISTS (
    SELECT 1 FROM product_pack_prices existing
    WHERE existing.product_id = td.keep_id AND lower(existing.pack_size) = lower(pp.pack_size)
  )
  ON CONFLICT DO NOTHING
),
-- Delete pack prices of duplicates
delete_dup_packs AS (
  DELETE FROM product_pack_prices
  WHERE product_id IN (SELECT del_id FROM to_delete)
)
-- Delete duplicate products
DELETE FROM products
WHERE id IN (SELECT del_id FROM to_delete);
