
-- 1) Delete all 355ml entries (not a real pack size)
DELETE FROM product_pack_prices pp
USING products p
WHERE pp.product_id = p.id
  AND p.category IN ('beer', 'ciders_seltzers')
  AND pp.pack_size ~* '^355\s*ml$';

-- 2) Universal normalizer that ALSO handles hyphens (e.g. "24-pack")
DO $$
DECLARE
  v_row RECORD;
  v_num TEXT;
  v_unit TEXT;
  v_canonical TEXT;
  v_existing_id UUID;
  v_existing_price NUMERIC;
BEGIN
  FOR v_row IN
    SELECT pp.id, pp.product_id, pp.pack_size, pp.price
    FROM product_pack_prices pp
    JOIN products p ON p.id = pp.product_id
    WHERE p.category IN ('beer', 'ciders_seltzers')
      AND pp.pack_size ~* '^\d+[\s-]*(pack|cans?|bottles?)$'
    ORDER BY pp.price DESC NULLS LAST  -- prefer higher prices when merging
  LOOP
    v_num := (regexp_match(v_row.pack_size, '^(\d+)'))[1];

    IF v_row.pack_size ~* 'bottles?$' THEN
      v_unit := 'Bottles';
    ELSE
      v_unit := 'Cans';
    END IF;

    v_canonical := v_num || ' ' || v_unit;

    IF v_row.pack_size = v_canonical THEN
      CONTINUE;
    END IF;

    SELECT id, price INTO v_existing_id, v_existing_price
    FROM product_pack_prices
    WHERE product_id = v_row.product_id AND pack_size = v_canonical
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      -- Keep highest non-zero price
      UPDATE product_pack_prices
      SET price = GREATEST(COALESCE(NULLIF(v_existing_price, 0), v_row.price),
                           COALESCE(NULLIF(v_row.price, 0), v_existing_price)),
          updated_at = now()
      WHERE id = v_existing_id;

      DELETE FROM product_pack_prices WHERE id = v_row.id;
    ELSE
      UPDATE product_pack_prices
      SET pack_size = v_canonical, updated_at = now()
      WHERE id = v_row.id;
    END IF;
  END LOOP;
END $$;

-- 3) Normalize "1-tall" / "1 tall" / "1 Tall" -> "1 Tall Can"
DO $$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT pp.id, pp.product_id, pp.pack_size, pp.price
    FROM product_pack_prices pp
    JOIN products p ON p.id = pp.product_id
    WHERE p.category IN ('beer', 'ciders_seltzers')
      AND pp.pack_size ~* '^1[\s-]*tall(\s*can)?$'
      AND pp.pack_size <> '1 Tall Can'
  LOOP
    IF EXISTS (SELECT 1 FROM product_pack_prices WHERE product_id = v_row.product_id AND pack_size = '1 Tall Can') THEN
      UPDATE product_pack_prices
      SET price = GREATEST(price, v_row.price), updated_at = now()
      WHERE product_id = v_row.product_id AND pack_size = '1 Tall Can';
      DELETE FROM product_pack_prices WHERE id = v_row.id;
    ELSE
      UPDATE product_pack_prices SET pack_size = '1 Tall Can', updated_at = now() WHERE id = v_row.id;
    END IF;
  END LOOP;
END $$;
