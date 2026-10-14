-- Store flyer listings shown under Weekly Deals.
-- Rows are written by the flyer sync function (service_role) and read publicly.
CREATE TABLE public.flyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL,
  source text NOT NULL,
  title text,
  image_url text,
  flyer_url text,
  valid_from date,
  valid_to date,
  is_active boolean NOT NULL DEFAULT true,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, flyer_url)
);

GRANT SELECT ON public.flyers TO anon, authenticated;
GRANT ALL ON public.flyers TO service_role;

ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view flyers" ON public.flyers
  FOR SELECT USING (true);

CREATE INDEX flyers_active_valid_idx ON public.flyers (is_active, valid_to);
