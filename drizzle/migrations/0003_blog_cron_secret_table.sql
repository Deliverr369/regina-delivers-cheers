-- Dedicated DB-held secret for the nightly blog draft cron job, so the
-- schedule and the function can verify each other without env values.
CREATE TABLE public.cron_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL
);
GRANT ALL ON public.cron_secrets TO service_role;
ALTER TABLE public.cron_secrets ENABLE ROW LEVEL SECURITY;
-- No policies: only service-role code (edge functions) may read this table.

DO $$
DECLARE
  v_secret text;
BEGIN
  SELECT secret INTO v_secret FROM public.cron_secrets WHERE name = 'blog-drafts';
  IF v_secret IS NULL THEN
    v_secret := md5('blog-drafts-' || gen_random_uuid()::text || clock_timestamp()::text);
    INSERT INTO public.cron_secrets (name, secret) VALUES ('blog-drafts', v_secret);
  END IF;

  PERFORM cron.unschedule('blog-drafts-daily');
  PERFORM cron.schedule(
    'blog-drafts-daily',
    '0 6 * * *',
    format($cron$
      SELECT net.http_post(
        url := 'https://jytbfknhebutyshjzdxt.supabase.co/functions/v1/generate-blog-drafts',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', %L
        ),
        body := jsonb_build_object('cron', true)
      )::text
    $cron$, v_secret)
  );
END $$;