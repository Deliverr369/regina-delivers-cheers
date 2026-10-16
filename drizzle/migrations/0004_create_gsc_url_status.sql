CREATE TABLE public.gsc_url_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  verdict TEXT,
  coverage_state TEXT,
  robots_txt_state TEXT,
  indexing_state TEXT,
  page_fetch_state TEXT,
  last_crawl_time TIMESTAMPTZ,
  google_canonical TEXT,
  user_canonical TEXT,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gsc_url_status TO authenticated;
GRANT ALL ON public.gsc_url_status TO service_role;

ALTER TABLE public.gsc_url_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read Search Console URL status"
ON public.gsc_url_status
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));