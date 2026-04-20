-- Background image-matching job state + cron setup
CREATE TABLE IF NOT EXISTS public.image_match_jobs (
  id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  source_url text NOT NULL,
  source_label text NOT NULL,
  batch_size integer NOT NULL DEFAULT 5,
  min_score numeric NOT NULL DEFAULT 0.5,
  last_run_at timestamptz,
  last_processed integer,
  last_updated integer,
  last_remaining integer,
  last_error text,
  total_updated integer NOT NULL DEFAULT 0,
  total_runs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.image_match_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage image match jobs"
  ON public.image_match_jobs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_image_match_jobs_updated_at
BEFORE UPDATE ON public.image_match_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.image_match_jobs (id, source_url, source_label)
VALUES
  ('shopliquoryxe', 'https://shopliquoryxe.ca/', 'Shop Liquor YXE'),
  ('willowparkwines', 'https://willowparkwines-sk.com/', 'Willow Park Wines SK')
ON CONFLICT (id) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;