

## Plan: Sync CSV Product Data to Database

### What We Have
The uploaded CSV contains 36 beer products from shopliquoryxe.ca with product name, Shopify image URL, price, and pack size (6 Cans through 24 Cans/Bottles).

### Steps

1. **Query existing products and stores**
   - Get all store IDs and all current product names to determine what already exists vs. what's new.

2. **Create new products that don't exist yet**
   - Cross-reference CSV product base names (e.g., "Kokanee", "Coors Light", "Busch Lager", "Pabst Blue Ribbon", "Original 16 Pale Ale", "Molson Canadian") against existing products.
   - Insert any missing products across all 7 stores with category `beer`, default price from the CSV, and image URLs.

3. **Download product images**
   - Fetch higher-resolution versions of the Shopify CDN images (swapping `180x` for `2048x` in the URL).
   - Save to `public/images/products/` with clean filenames.
   - Update the `image_url` field for products that currently lack images.

4. **Update/create pack prices**
   - For each CSV row, find the matching product in each store and add/update the corresponding entry in `product_pack_prices` with the correct pack size and price.
   - Standardize pack size format (e.g., "12 Bottles", "15 Cans", "24 Cans").

### New Products to Add (likely not yet in DB)
- Kokanee (if missing size variants)
- Coors Light
- Original 16 Pale Ale
- Molson Canadian
- Busch Lager
- Pabst Blue Ribbon

### Technical Details
- Database migrations for new product inserts across all 7 stores
- Shopify image URLs will be fetched at higher resolution (replace `_180x` with `_2048x`)
- Pack prices inserted via SQL into `product_pack_prices` table
- All 36 rows mapped to appropriate products and sizes

