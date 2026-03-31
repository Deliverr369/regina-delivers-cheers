
-- Step 1: Insert pack prices from variant products into their base products
INSERT INTO product_pack_prices (product_id, pack_size, price)
SELECT DISTINCT b.id as product_id,
  CASE 
    WHEN v.name ~* '1140' THEN '1.14L'
    WHEN v.name ~* '1\.14\s*L' THEN '1.14L'  
    WHEN v.name ~* '1\.75\s*L' THEN '1.75L'
    WHEN v.name ~* '750' THEN '750 mL'
    WHEN v.name ~* '700' THEN '700 mL'
    WHEN v.name ~* '375' THEN '375 mL'
    WHEN v.name ~* '200' THEN '200 mL'
  END as pack_size,
  v.price
FROM products v
JOIN products b 
  ON lower(trim(regexp_replace(v.name, '\s+(1\.75\s*L|1\.14\s*L|1140\s*m[lL]?|750\s*m[lL]?|700\s*m[lL]?|375\s*m[lL]?|200\s*m[lL]?)$', '', 'i'))) = lower(trim(b.name))
  AND b.store_id = v.store_id
  AND b.id != v.id
  AND NOT (b.name ~* '\d{3,4}\s*m[lL]' OR b.name ~* '\d+\.\d+\s*L')
WHERE v.category = 'spirits'
AND (v.name ~* '\d{3,4}\s*m[lL]' OR v.name ~* '\d+\.\d+\s*L')
ON CONFLICT DO NOTHING;

-- Step 2: Delete pack prices belonging to variant products
DELETE FROM product_pack_prices WHERE product_id IN (
  SELECT v.id
  FROM products v
  JOIN products b 
    ON lower(trim(regexp_replace(v.name, '\s+(1\.75\s*L|1\.14\s*L|1140\s*m[lL]?|750\s*m[lL]?|700\s*m[lL]?|375\s*m[lL]?|200\s*m[lL]?)$', '', 'i'))) = lower(trim(b.name))
    AND b.store_id = v.store_id
    AND b.id != v.id
    AND NOT (b.name ~* '\d{3,4}\s*m[lL]' OR b.name ~* '\d+\.\d+\s*L')
  WHERE v.category = 'spirits'
  AND (v.name ~* '\d{3,4}\s*m[lL]' OR v.name ~* '\d+\.\d+\s*L')
);

-- Step 3: Delete the variant product rows
DELETE FROM products WHERE id IN (
  SELECT v.id
  FROM products v
  JOIN products b 
    ON lower(trim(regexp_replace(v.name, '\s+(1\.75\s*L|1\.14\s*L|1140\s*m[lL]?|750\s*m[lL]?|700\s*m[lL]?|375\s*m[lL]?|200\s*m[lL]?)$', '', 'i'))) = lower(trim(b.name))
    AND b.store_id = v.store_id
    AND b.id != v.id
    AND NOT (b.name ~* '\d{3,4}\s*m[lL]' OR b.name ~* '\d+\.\d+\s*L')
  WHERE v.category = 'spirits'
  AND (v.name ~* '\d{3,4}\s*m[lL]' OR v.name ~* '\d+\.\d+\s*L')
);

-- Step 4: For remaining variants with NO base product, rename the first one per group
-- First, handle groups where ALL products have sizes - pick one to keep and rename
WITH ranked AS (
  SELECT id, name, store_id, price,
    regexp_replace(name, '\s+(1\.75\s*L|1\.14\s*L|1140\s*m[lL]?|750\s*m[lL]?|700\s*m[lL]?|375\s*m[lL]?|200\s*m[lL]?)$', '', 'i') as base_name,
    CASE 
      WHEN name ~* '750' THEN 1
      WHEN name ~* '1140|1\.14' THEN 2
      WHEN name ~* '1\.75' THEN 3
      WHEN name ~* '375' THEN 4
      ELSE 5
    END as size_priority,
    ROW_NUMBER() OVER (
      PARTITION BY regexp_replace(lower(trim(name)), '\s+(1\.75\s*l|1\.14\s*l|1140\s*ml?|750\s*ml?|700\s*ml?|375\s*ml?|200\s*ml?)$', '', 'i'), store_id
      ORDER BY CASE WHEN name ~* '750' THEN 1 WHEN name ~* '1140|1\.14' THEN 2 WHEN name ~* '1\.75' THEN 3 ELSE 4 END
    ) as rn
  FROM products
  WHERE category = 'spirits'
  AND (name ~* '\d{3,4}\s*m[lL]' OR name ~* '\d+\.\d+\s*L')
)
UPDATE products SET name = ranked.base_name
FROM ranked
WHERE products.id = ranked.id AND ranked.rn = 1;

-- Step 5: Now merge remaining duplicates (variants that aren't the primary)
-- Insert their prices as pack prices on the renamed primary
INSERT INTO product_pack_prices (product_id, pack_size, price)
SELECT DISTINCT b.id,
  CASE 
    WHEN v.name ~* '1140' THEN '1.14L'
    WHEN v.name ~* '1\.14\s*L' THEN '1.14L'
    WHEN v.name ~* '1\.75\s*L' THEN '1.75L'
    WHEN v.name ~* '750' THEN '750 mL'
    WHEN v.name ~* '700' THEN '700 mL'
    WHEN v.name ~* '375' THEN '375 mL'
    WHEN v.name ~* '200' THEN '200 mL'
  END,
  v.price
FROM products v
JOIN products b 
  ON lower(trim(regexp_replace(v.name, '\s+(1\.75\s*L|1\.14\s*L|1140\s*m[lL]?|750\s*m[lL]?|700\s*m[lL]?|375\s*m[lL]?|200\s*m[lL]?)$', '', 'i'))) = lower(trim(b.name))
  AND b.store_id = v.store_id
  AND b.id != v.id
  AND NOT (b.name ~* '\d{3,4}\s*m[lL]' OR b.name ~* '\d+\.\d+\s*L')
WHERE v.category = 'spirits'
AND (v.name ~* '\d{3,4}\s*m[lL]' OR v.name ~* '\d+\.\d+\s*L')
ON CONFLICT DO NOTHING;

-- Step 6: Delete those remaining variants
DELETE FROM product_pack_prices WHERE product_id IN (
  SELECT v.id FROM products v
  JOIN products b 
    ON lower(trim(regexp_replace(v.name, '\s+(1\.75\s*L|1\.14\s*L|1140\s*m[lL]?|750\s*m[lL]?|700\s*m[lL]?|375\s*m[lL]?|200\s*m[lL]?)$', '', 'i'))) = lower(trim(b.name))
    AND b.store_id = v.store_id AND b.id != v.id
    AND NOT (b.name ~* '\d{3,4}\s*m[lL]' OR b.name ~* '\d+\.\d+\s*L')
  WHERE v.category = 'spirits'
  AND (v.name ~* '\d{3,4}\s*m[lL]' OR v.name ~* '\d+\.\d+\s*L')
);

DELETE FROM products WHERE id IN (
  SELECT v.id FROM products v
  JOIN products b 
    ON lower(trim(regexp_replace(v.name, '\s+(1\.75\s*L|1\.14\s*L|1140\s*m[lL]?|750\s*m[lL]?|700\s*m[lL]?|375\s*m[lL]?|200\s*m[lL]?)$', '', 'i'))) = lower(trim(b.name))
    AND b.store_id = v.store_id AND b.id != v.id
    AND NOT (b.name ~* '\d{3,4}\s*m[lL]' OR b.name ~* '\d+\.\d+\s*L')
  WHERE v.category = 'spirits'
  AND (v.name ~* '\d{3,4}\s*m[lL]' OR v.name ~* '\d+\.\d+\s*L')
);
