-- =========================
-- FAVORITES
-- =========================
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX idx_favorites_user ON public.favorites (user_id, created_at DESC);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users add own favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- =========================
-- PROMO CODES
-- =========================
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  one_per_customer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_promo_codes_code_active
  ON public.promo_codes (lower(code))
  WHERE is_active = true;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active codes (needed to validate at checkout)
CREATE POLICY "Authenticated can view active promo codes"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Admins manage promo codes"
  ON public.promo_codes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- PROMO CODE REDEMPTIONS
-- =========================
CREATE TABLE public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL,
  discount_amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, order_id)
);

CREATE INDEX idx_redemptions_user ON public.promo_code_redemptions (user_id);
CREATE INDEX idx_redemptions_promo ON public.promo_code_redemptions (promo_code_id);

ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions"
  ON public.promo_code_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own redemptions"
  ON public.promo_code_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all redemptions"
  ON public.promo_code_redemptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- ORDERS — discount tracking
-- =========================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;