
-- Remove duplicate Great Western Light entries (keep the 24-pack one with price)
DELETE FROM products WHERE id IN ('4ede04b4-aa28-4860-9bb0-7280bd6c2336', 'afd98265-7c5f-46d2-8456-98a07023305b');

-- Remove duplicate Original 16 Prairie White (keep the 15-pack one with price)
DELETE FROM products WHERE id = '653909fb-8f5a-4494-816a-6ffea95b5bd6';
