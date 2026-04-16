
-- Normalize "N Pack" -> "N Cans" in product_pack_prices for beer category
-- When both exist for the same product, keep the higher price and delete the duplicate

DO $$
DECLARE
  v_row RECORD;
  v_new_size TEXT;
  v_existing_id UUID;
  v_existing_price NUMERIC;
BEGIN
  FOR v_row IN
    SELECT pp.id, pp.product_id, pp.pack_size, pp.price
    FROM product_pack_prices pp
    JOIN products p ON p.id = pp.product_id
    WHERE p.category = 'beer'
      AND pp.pack_size ~* '^\d+\s*pack$'
  LOOP
    -- Convert "24 Pack" -> "24 Cans"
    v_new_size := regexp_replace(v_row.pack_size, '^(\d+)\s*pack$', '\1 Cans', 'i');

    -- Check if a "N Cans" entry already exists for this product
    SELECT id, price INTO v_existing_id, v_existing_price
    FROM product_pack_prices
    WHERE product_id = v_row.product_id AND pack_size = v_new_size
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      -- Keep the higher price on the existing "N Cans" row, delete the "N Pack" row
      UPDATE product_pack_prices
      SET price = GREATEST(v_existing_price, v_row.price),
          updated_at = now()
      WHERE id = v_existing_id;

      DELETE FROM product_pack_prices WHERE id = v_row.id;
    ELSE
      -- No existing "N Cans" row — just rename
      UPDATE product_pack_prices
      SET pack_size = v_new_size, updated_at = now()
      WHERE id = v_row.id;
    END IF;
  END LOOP;
END $$;

-- Also normalize "1 Tall Can" variants like "1 tall can", "1 Tall" -> "1 Tall Can" (canonical)
UPDATE product_pack_prices pp
SET pack_size = '1 Tall Can', updated_at = now()
FROM products p
WHERE pp.product_id = p.id
  AND p.category = 'beer'
  AND pp.pack_size ~* '^1\s*tall(\s*can)?$'
  AND pp.pack_size <> '1 Tall Can'
  AND NOT EXISTS (
    SELECT 1 FROM product_pack_prices pp2
    WHERE pp2.product_id = pp.product_id AND pp2.pack_size = '1 Tall Can'
  );

-- Delete leftover "1 Tall" duplicates where canonical "1 Tall Can" already exists (keep higher price)
DO $$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT pp.id, pp.product_id, pp.price
    FROM product_pack_prices pp
    JOIN products p ON p.id = pp.product_id
    WHERE p.category = 'beer'
      AND pp.pack_size ~* '^1\s*tall(\s*can)?$'
      AND pp.pack_size <> '1 Tall Can'
  LOOP
    UPDATE product_pack_prices
    SET price = GREATEST(price, v_row.price), updated_at = now()
    WHERE product_id = v_row.product_id AND pack_size = '1 Tall Can';
    DELETE FROM product_pack_prices WHERE id = v_row.id;
  END LOOP;
END $$;
