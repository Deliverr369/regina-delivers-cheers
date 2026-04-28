-- Backend safety net: ensure orders.store_id is always populated.
-- Strategy: a BEFORE INSERT trigger that, if store_id is NULL, attempts to
-- derive it from the inserted order_items (most common product's store).
-- If still NULL after that, falls back to any active store. As a final
-- guarantee, set the column to NOT NULL.

CREATE OR REPLACE FUNCTION public.ensure_order_store_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  IF NEW.store_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Try: most-frequent store among the order's items (items may be inserted
  -- in the same transaction; this runs on UPDATE after items exist too).
  SELECT p.store_id
  INTO v_store_id
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = NEW.id
    AND p.store_id IS NOT NULL
  GROUP BY p.store_id
  ORDER BY COUNT(*) DESC, SUM(oi.price * oi.quantity) DESC
  LIMIT 1;

  IF v_store_id IS NULL THEN
    -- Final fallback: any store (prefer one flagged open).
    SELECT id INTO v_store_id
    FROM public.stores
    ORDER BY (is_open IS TRUE) DESC, created_at ASC
    LIMIT 1;
  END IF;

  NEW.store_id := v_store_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_order_store_id_biu ON public.orders;
CREATE TRIGGER ensure_order_store_id_biu
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.ensure_order_store_id();

-- Backfill any historical NULLs using the same logic before adding NOT NULL.
UPDATE public.orders o
SET store_id = sub.store_id
FROM (
  SELECT oi.order_id,
         (
           SELECT p.store_id
           FROM public.order_items oi2
           JOIN public.products p ON p.id = oi2.product_id
           WHERE oi2.order_id = oi.order_id AND p.store_id IS NOT NULL
           GROUP BY p.store_id
           ORDER BY COUNT(*) DESC, SUM(oi2.price * oi2.quantity) DESC
           LIMIT 1
         ) AS store_id
  FROM public.order_items oi
  GROUP BY oi.order_id
) sub
WHERE o.id = sub.order_id
  AND o.store_id IS NULL
  AND sub.store_id IS NOT NULL;

-- For any still-null orders (no items / orphaned), assign the first store.
UPDATE public.orders
SET store_id = (SELECT id FROM public.stores ORDER BY created_at ASC LIMIT 1)
WHERE store_id IS NULL
  AND EXISTS (SELECT 1 FROM public.stores);

-- Enforce NOT NULL at the schema level.
ALTER TABLE public.orders ALTER COLUMN store_id SET NOT NULL;