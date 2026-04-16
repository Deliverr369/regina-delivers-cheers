DO $$
DECLARE
  v_store_id uuid;
  v_canon TEXT;
  v_canonical_id uuid;
  v_pack TEXT;
  v_packs TEXT[] := ARRAY['6 Cans','8 Cans','15 Cans','18 Cans','24 Cans'];
  v_canons TEXT[] := ARRAY[
    'Bohemian','Brewhouse Light','Budweiser','Great Western Lager','Great Western Ultra',
    'Miller Genuine Draft','Miller Lite','Pabst Light','Sleeman','Alexander Keith''s',
    'Alberta Genuine Draft','Blue Moon','Brewhouse Ice','Brewhouse Pilsner','Bud Light',
    'Busch Ice','Busch Light','Busch','Coors Light','Coors Original','Corona Extra',
    'Great Western Classic','Great Western Light','Great Western Pilsner','Great Western Lime',
    'Great Western Radler','Heineken','Keystone Light','Labatt Blue','Molson Ultra',
    'Molson Canadian','Pilsner','Old Milwaukee','Original 16 Pale Ale','Pabst Blue Ribbon','SOL'
  ];
  v_alias_pairs TEXT[][] := ARRAY[
    ['Brew House Light','Brewhouse Light'],
    ['Great Western Large','Great Western Lager'],
    ['Miller Genuine','Miller Genuine Draft'],
    ['Original Sixteen','Original 16 Pale Ale'],
    ['Original 16','Original 16 Pale Ale'],
    ['Alexander Keith','Alexander Keith''s']
  ];
  v_variant RECORD;
  v_pack_size TEXT;
  v_match TEXT;
  v_target_canon TEXT;
  v_img TEXT;
  v_alias_pair TEXT[];
  v_pat TEXT;
BEGIN
  FOREACH v_canon IN ARRAY v_canons LOOP
    SELECT image_url INTO v_img
    FROM products
    WHERE category='beer' AND image_url IS NOT NULL
      AND (lower(name)=lower(v_canon) OR lower(name) LIKE lower(v_canon)||' %')
    LIMIT 1;

    FOR v_store_id IN SELECT id FROM stores LOOP
      IF NOT EXISTS (SELECT 1 FROM products WHERE category='beer' AND store_id=v_store_id AND lower(name)=lower(v_canon)) THEN
        INSERT INTO products (name, category, store_id, price, image_url, in_stock, is_hidden)
        VALUES (v_canon, 'beer', v_store_id, 0, v_img, true, false);
      END IF;
    END LOOP;
  END LOOP;

  FOR v_variant IN
    SELECT p.id, p.name, p.store_id, p.price, p.image_url
    FROM products p
    WHERE p.category='beer'
      AND p.name ~* '\d+\s*(cans?|bottles?|pack)s?\s*$'
  LOOP
    v_target_canon := NULL;
    v_pack_size := NULL;

    FOR v_canon IN
      SELECT c FROM unnest(v_canons) AS c ORDER BY length(c) DESC
    LOOP
      v_pat := '^' || regexp_replace(v_canon, '([^a-zA-Z0-9 ])', '\\\1', 'g') || '\s+(\d+)\s*(cans?|bottles?|pack)s?\s*$';
      IF v_variant.name ~* v_pat THEN
        v_target_canon := v_canon;
        v_match := (regexp_match(v_variant.name, v_pat, 'i'))[1];
        v_pack := lower((regexp_match(v_variant.name, v_pat, 'i'))[2]);
        IF v_pack LIKE 'bottle%' THEN
          v_pack_size := v_match || ' Bottles';
        ELSIF v_pack = 'pack' THEN
          v_pack_size := v_match || ' Pack';
        ELSE
          v_pack_size := v_match || ' Cans';
        END IF;
        EXIT;
      END IF;
    END LOOP;

    IF v_target_canon IS NULL THEN
      FOREACH v_alias_pair SLICE 1 IN ARRAY v_alias_pairs LOOP
        v_pat := '^' || regexp_replace(v_alias_pair[1], '([^a-zA-Z0-9 ])', '\\\1', 'g') || '\s+(\d+)\s*(cans?|bottles?|pack)s?\s*$';
        IF v_variant.name ~* v_pat THEN
          v_target_canon := v_alias_pair[2];
          v_match := (regexp_match(v_variant.name, v_pat, 'i'))[1];
          v_pack := lower((regexp_match(v_variant.name, v_pat, 'i'))[2]);
          IF v_pack LIKE 'bottle%' THEN
            v_pack_size := v_match || ' Bottles';
          ELSIF v_pack = 'pack' THEN
            v_pack_size := v_match || ' Pack';
          ELSE
            v_pack_size := v_match || ' Cans';
          END IF;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF v_target_canon IS NULL THEN CONTINUE; END IF;

    SELECT id INTO v_canonical_id
    FROM products
    WHERE category='beer' AND store_id=v_variant.store_id AND lower(name)=lower(v_target_canon)
    LIMIT 1;

    IF v_canonical_id IS NULL THEN CONTINUE; END IF;

    IF v_variant.price IS NOT NULL AND v_variant.price > 0 THEN
      INSERT INTO product_pack_prices (product_id, pack_size, price)
      VALUES (v_canonical_id, v_pack_size, v_variant.price)
      ON CONFLICT (product_id, pack_size) DO UPDATE SET price = GREATEST(product_pack_prices.price, EXCLUDED.price);
    END IF;

    INSERT INTO product_pack_prices (product_id, pack_size, price)
    SELECT v_canonical_id, pack_size, price FROM product_pack_prices WHERE product_id = v_variant.id
    ON CONFLICT (product_id, pack_size) DO UPDATE SET price = GREATEST(product_pack_prices.price, EXCLUDED.price);

    UPDATE products SET image_url = v_variant.image_url
    WHERE id = v_canonical_id AND image_url IS NULL AND v_variant.image_url IS NOT NULL;

    DELETE FROM product_pack_prices WHERE product_id = v_variant.id;
    DELETE FROM products WHERE id = v_variant.id;
  END LOOP;

  FOREACH v_canon IN ARRAY v_canons LOOP
    FOR v_canonical_id IN
      SELECT id FROM products WHERE category='beer' AND lower(name)=lower(v_canon)
    LOOP
      FOREACH v_pack_size IN ARRAY v_packs LOOP
        INSERT INTO product_pack_prices (product_id, pack_size, price)
        VALUES (v_canonical_id, v_pack_size, 0)
        ON CONFLICT (product_id, pack_size) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;