CREATE TABLE public.blg_articles (
  id bigint PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  previous_slugs text[] NOT NULL DEFAULT '{}',
  title text NOT NULL,
  meta_description text,
  hero_image_url text,
  language_code text,
  content_html text,
  json_ld jsonb,
  faq_json_ld jsonb,
  article_created_at timestamptz,
  article_updated_at timestamptz,
  synced_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.blg_articles TO anon, authenticated;
GRANT ALL ON public.blg_articles TO service_role;
ALTER TABLE public.blg_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read blg articles" ON public.blg_articles FOR SELECT USING (true);
CREATE INDEX blg_articles_created_idx ON public.blg_articles (article_created_at DESC);
CREATE INDEX blg_articles_prev_slugs_idx ON public.blg_articles USING gin (previous_slugs);

CREATE TABLE public.blg_sync_state (
  id int PRIMARY KEY CHECK (id = 1),
  list_offset int NOT NULL DEFAULT 0,
  list_complete boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  lease_until timestamptz,
  next_allowed_at timestamptz,
  consecutive_429 int NOT NULL DEFAULT 0
);
GRANT ALL ON public.blg_sync_state TO service_role;
ALTER TABLE public.blg_sync_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.blg_sync_state (id) VALUES (1);