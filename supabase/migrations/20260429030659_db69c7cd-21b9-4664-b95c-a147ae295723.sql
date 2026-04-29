CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author TEXT DEFAULT 'Deliverr Team',
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published posts are viewable by everyone"
ON public.blog_posts FOR SELECT
USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert posts"
ON public.blog_posts FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update posts"
ON public.blog_posts FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete posts"
ON public.blog_posts FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a few starter posts for SEO
INSERT INTO public.blog_posts (slug, title, excerpt, content, published, published_at, meta_title, meta_description, keywords) VALUES
('best-alcohol-delivery-regina-2026',
 'Best Alcohol Delivery in Regina (2026 Guide)',
 'Compare the fastest, cheapest ways to get beer, wine and spirits delivered in Regina, SK.',
 E'# Best Alcohol Delivery in Regina (2026 Guide)\n\nLooking for the fastest way to get beer, wine, or spirits delivered in Regina? Here is the complete 2026 guide.\n\n## Why Use Deliverr?\n\n- **Same-day delivery** in under 60 minutes across Regina\n- **Store prices** — no markups on products\n- **All major Regina retailers** in one app: Costco, Superstore, Sobeys, and local liquor stores\n- **19+ verified** at checkout and at the door\n\n## Delivery Areas\n\nWe deliver across all Regina neighborhoods including Cathedral, Harbour Landing, Lakeview, The Crescents, Albert Park, Hillsdale, Whitmore Park, and Eastview.\n\n## How to Order\n\n1. Browse stores by category\n2. Add items to your cart\n3. Verify your age (19+) and Regina address\n4. Pay by credit card and track your driver in real time\n\nReady to order? [Browse stores in Regina now](/stores).',
 true, now(),
 'Best Alcohol Delivery in Regina 2026 | Deliverr',
 'Compare Regina''s top alcohol delivery services. Same-day beer, wine and spirits delivery from Costco, Superstore and local stores. Order now.',
 ARRAY['alcohol delivery regina','liquor delivery regina','beer delivery regina','wine delivery regina']),

('same-day-liquor-delivery-regina',
 'Same-Day Liquor Delivery in Regina — How It Works',
 'Get liquor delivered to your door in Regina in under 60 minutes. Here is how.',
 E'# Same-Day Liquor Delivery in Regina\n\nNeed wine, beer, or spirits tonight? Deliverr offers **same-day liquor delivery in Regina** in under 60 minutes.\n\n## What You Can Order\n\n- Beer (singles, 6-packs, 12-packs, 24-packs)\n- Wine (red, white, rosé, sparkling)\n- Spirits (vodka, whisky, rum, tequila, gin)\n- Coolers, ciders & seltzers\n- Smokes and vapes\n\n## Delivery Times\n\nMost orders arrive in **30-60 minutes** depending on store hours and demand. Free delivery on orders over $50.\n\n## Service Area\n\nWe deliver to **all of Regina, SK** — every postal code in the city.\n\n[Start your order now →](/stores)',
 true, now() - interval '1 day',
 'Same-Day Liquor Delivery Regina | 60-Minute Service',
 'Same-day liquor delivery in Regina, SK. Beer, wine, spirits delivered in under 60 minutes. Free delivery over $50. Order now from Deliverr.',
 ARRAY['same day liquor delivery regina','liquor delivery near me regina','fast alcohol delivery regina']),

('regina-store-hours-guide',
 'Regina Liquor & Grocery Store Hours Guide',
 'Complete hours for every major Regina retailer that delivers with Deliverr.',
 E'# Regina Store Hours Guide\n\nWondering which stores are open right now in Regina? Here is the complete guide to delivery hours from our partner retailers.\n\n## Liquor Stores\n\nMost SLGA-licensed liquor stores in Regina open at **10:00 AM** and close at **2:00 AM** (closing time may vary by location).\n\n## Grocery Stores\n\n- **Costco Regina** — typical hours 10am-8:30pm weekdays\n- **Real Canadian Superstore** — 7am-11pm daily\n- **Sobeys Regina** — 7am-11pm daily\n\n## Holiday Hours\n\nAll stores follow Saskatchewan provincial holiday hours. Live hours always show on each [store page](/stores).',
 true, now() - interval '2 days',
 'Regina Store Hours Guide | Liquor & Grocery',
 'Up-to-date Regina store hours for liquor stores, Costco, Superstore and Sobeys. Find out what is open now and order delivery.',
 ARRAY['regina store hours','regina liquor store hours','costco regina hours','superstore regina hours']);