
-- Set display_order = -5 for all listed beers to put them at the very top
-- Update existing products first
UPDATE products SET display_order = -5 WHERE store_id = '334b6260-b35b-404b-9645-b1bfe0fcd667' AND category = 'beer' AND name IN (
  'Brewhouse Ice', 'Brewhouse Light', 'Brewhouse Ultra',
  'Bud Light', 'Busch',
  'Co-op Gold Lager', 'Co-op Gold Light',
  'Corona Extra', 'Corona Light',
  'Great Western Lager', 'Great Western Light', 'Great Western Lime', 'Great Western Ultra',
  'Kokanee',
  'Miller High Life', 'Miller Lite',
  'Molson Cold Shots', 'Molson Ultra',
  'Moosehead Lager',
  'Old Style Pilsner',
  'Original 16 Canadian Ultra Lager', 'Original 16 Canadian Pale Ale', 'Original 16 Prairie White',
  'Pabst Blue Ribbon',
  'Miller Genuine Draft'
);

-- Insert missing beers that don't exist yet
INSERT INTO products (store_id, name, category, price, display_order, in_stock) VALUES
  ('334b6260-b35b-404b-9645-b1bfe0fcd667', 'Slope Ultra', 'beer', 0, -5, true),
  ('334b6260-b35b-404b-9645-b1bfe0fcd667', 'Moosehead Pilsner 60', 'beer', 0, -5, true),
  ('334b6260-b35b-404b-9645-b1bfe0fcd667', 'Pilsner 16', 'beer', 0, -5, true),
  ('334b6260-b35b-404b-9645-b1bfe0fcd667', 'Original 16 White', 'beer', 0, -5, true),
  ('334b6260-b35b-404b-9645-b1bfe0fcd667', 'Ops Light', 'beer', 0, -5, true),
  ('334b6260-b35b-404b-9645-b1bfe0fcd667', 'Slim and Clear', 'beer', 0, -5, true),
  ('334b6260-b35b-404b-9645-b1bfe0fcd667', 'Honey Lager', 'beer', 0, -5, true),
  ('334b6260-b35b-404b-9645-b1bfe0fcd667', 'SOL', 'beer', 0, -5, true)
ON CONFLICT DO NOTHING;
