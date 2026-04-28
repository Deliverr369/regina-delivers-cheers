ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_window text,
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'asap';