
-- Step 1: Migrate missing pack prices from duplicates to base products
WITH size_suffixed AS (
  SELECT s.id as dup_id, s.name, s.store_id, s.category,
    regexp_replace(s.name, '\s+(750\s*ml|1\.14\s*L|1\.75\s*L|375\s*ml|200\s*ml|50\s*ml|1\s*L|1L|3\s*L|4\s*L|1\.5\s*L|700\s*mL|700\s*ml)\s*$', '', 'i') AS base_name
  FROM products s
  WHERE s.name ~ '\s+(750\s*ml|1\.14\s*L|1\.75\s*L|375\s*ml|200\s*ml|50\s*ml|1\s*L|1L|3\s*L|4\s*L|1\.5\s*L|700\s*mL|700\s*ml)\s*$'
),
base_products AS (
  SELECT p.id as base_id, s.dup_id
  FROM size_suffixed s
  JOIN products p ON lower(trim(p.name)) = lower(trim(s.base_name))
    AND p.store_id = s.store_id AND p.category = s.category
),
missing_packs AS (
  SELECT DISTINCT bp.base_id, pp.pack_size, pp.price, pp.is_hidden
  FROM base_products bp
  JOIN product_pack_prices pp ON pp.product_id = bp.dup_id
  WHERE NOT EXISTS (
    SELECT 1 FROM product_pack_prices bpp
    WHERE bpp.product_id = bp.base_id AND lower(bpp.pack_size) = lower(pp.pack_size)
  )
)
INSERT INTO product_pack_prices (product_id, pack_size, price, is_hidden)
SELECT base_id, pack_size, price, is_hidden FROM missing_packs;

-- Step 2: Delete pack prices belonging to duplicates
WITH size_suffixed AS (
  SELECT s.id as dup_id
  FROM products s
  WHERE s.name ~ '\s+(750\s*ml|1\.14\s*L|1\.75\s*L|375\s*ml|200\s*ml|50\s*ml|1\s*L|1L|3\s*L|4\s*L|1\.5\s*L|700\s*mL|700\s*ml)\s*$'
    AND EXISTS (
      SELECT 1 FROM products p
      WHERE lower(trim(p.name)) = lower(trim(regexp_replace(s.name, '\s+(750\s*ml|1\.14\s*L|1\.75\s*L|375\s*ml|200\s*ml|50\s*ml|1\s*L|1L|3\s*L|4\s*L|1\.5\s*L|700\s*mL|700\s*ml)\s*$', '', 'i')))
        AND p.store_id = s.store_id AND p.category = s.category
    )
)
DELETE FROM product_pack_prices WHERE product_id IN (SELECT dup_id FROM size_suffixed);

-- Step 3: Delete the duplicate products themselves
DELETE FROM products
WHERE name ~ '\s+(750\s*ml|1\.14\s*L|1\.75\s*L|375\s*ml|200\s*ml|50\s*ml|1\s*L|1L|3\s*L|4\s*L|1\.5\s*L|700\s*mL|700\s*ml)\s*$'
  AND EXISTS (
    SELECT 1 FROM products p
    WHERE lower(trim(p.name)) = lower(trim(regexp_replace(products.name, '\s+(750\s*ml|1\.14\s*L|1\.75\s*L|375\s*ml|200\s*ml|50\s*ml|1\s*L|1L|3\s*L|4\s*L|1\.5\s*L|700\s*mL|700\s*ml)\s*$', '', 'i')))
      AND p.store_id = products.store_id AND p.category = products.category
  );
