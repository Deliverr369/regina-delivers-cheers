-- Co-op Liquor spirits price import & cleanup
CREATE TEMP TABLE _spirits_stage(product_id uuid, pack_size text, price numeric) ON COMMIT DROP;

DO $$
DECLARE
BEGIN
  -- Will be populated by subsequent INSERTs in same migration via a function
  NULL;
END $$;