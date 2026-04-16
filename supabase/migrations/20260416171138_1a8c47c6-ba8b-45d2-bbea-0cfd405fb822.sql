
-- Universal pack-size normalizer for beer and ciders_seltzers.
-- Canonical form: "<N> Cans" or "<N> Bottles" (Title Case, plural).
-- "<N> Pack" is treated as "<N> Cans" (since cans are the dominant beer pack format).

DO $$
DECLARE
  v_row RECORD;
  v_num TEXT;
  v_unit TEXT;       -- 'cans' or 'bottles'
  v_canonical TEXT;
  v_existing_id UUID;
  v_existing_price NUMERIC;
BEGIN
  FOR v_row IN
    SELECT pp.id, pp.product_id, pp.pack_size, pp.price
    FROM product_pack_prices pp
    JOIN products p ON p.id = pp.product_id
    WHERE p.category IN ('beer', 'ciders_seltzers')
      AND pp.pack_size ~* '^\d+\s*(pack|cans?|bottles?)$'
    ORDER BY pp.price DESC  -- process higher prices first so canonical wins
  LOOP
    -- Extract numeric portion
    v_num := (regexp_match(v_row.pack_size, '^(\d+)', 'i'))[1];

    -- Determine unit: bottles stays bottles; cans/can/pack -> cans
    IF v_row.pack_size ~* 'bottles?$' THEN
      v_unit := 'Bottles';
    ELSE
      v_unit := 'Cans';
    END IF;

    v_canonical := v_num || ' ' || v_unit;

    -- Skip if already canonical
    IF v_row.pack_size = v_canonical THEN
      CONTINUE;
    END IF;

    -- Check if a canonical row already exists for this product
    SELECT id, price INTO v_existing_id, v_existing_price
    FROM product_pack_prices
    WHERE product_id = v_row.product_id AND pack_size = v_canonical
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      -- Merge: keep higher price on canonical, delete this duplicate
      UPDATE product_pack_prices
      SET price = GREATEST(v_existing_price, v_row.price), updated_at = now()
      WHERE id = v_existing_id;

      DELETE FROM product_pack_prices WHERE id = v_row.id;
    ELSE
      -- Just rename to canonical
      UPDATE product_pack_prices
      SET pack_size = v_canonical, updated_at = now()
      WHERE id = v_row.id;
    END IF;
  END LOOP;
END $$;
