-- 1. Per-weekday hours per store (0=Sun … 6=Sat)
CREATE TABLE public.store_hours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_closed   boolean NOT NULL DEFAULT false,
  open_time   time NOT NULL DEFAULT '10:00',
  close_time  time NOT NULL DEFAULT '22:00',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, weekday)
);

CREATE INDEX idx_store_hours_store ON public.store_hours(store_id);

ALTER TABLE public.store_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view store hours"
ON public.store_hours FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage store hours"
ON public.store_hours FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.store_hours TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_hours TO authenticated;

CREATE TRIGGER store_hours_updated_at
BEFORE UPDATE ON public.store_hours
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Auto-seed default hours (10:00–22:00, all 7 days) for every new store
CREATE OR REPLACE FUNCTION public.seed_store_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_hours (store_id, weekday, open_time, close_time)
  SELECT NEW.id, gs, '10:00'::time, '22:00'::time
  FROM generate_series(0, 6) AS gs
  ON CONFLICT (store_id, weekday) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seed_store_hours() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER stores_seed_hours
AFTER INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.seed_store_hours();

-- 3. Backfill for existing stores
INSERT INTO public.store_hours (store_id, weekday, open_time, close_time)
SELECT s.id, gs, '10:00'::time, '22:00'::time
FROM public.stores s
CROSS JOIN generate_series(0, 6) AS gs
ON CONFLICT (store_id, weekday) DO NOTHING;