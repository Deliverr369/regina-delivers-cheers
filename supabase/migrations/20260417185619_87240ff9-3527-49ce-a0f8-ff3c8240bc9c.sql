-- Add estimated/final pricing + Stripe pre-auth tracking to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_subtotal numeric,
  ADD COLUMN IF NOT EXISTS estimated_total numeric,
  ADD COLUMN IF NOT EXISTS final_subtotal numeric,
  ADD COLUMN IF NOT EXISTS final_total numeric,
  ADD COLUMN IF NOT EXISTS authorized_amount numeric,
  ADD COLUMN IF NOT EXISTS convenience_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS final_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_confirmed_by uuid;

-- Add estimated/final price tracking to order items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS estimated_price numeric,
  ADD COLUMN IF NOT EXISTS final_price numeric;

-- Backfill existing rows so reads stay consistent
UPDATE public.orders
SET estimated_subtotal = subtotal,
    estimated_total = total,
    payment_status = COALESCE(payment_status, 'legacy')
WHERE estimated_subtotal IS NULL;

UPDATE public.order_items
SET estimated_price = price
WHERE estimated_price IS NULL;

-- Audit log of admin price adjustments
CREATE TABLE IF NOT EXISTS public.order_price_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE,
  field text NOT NULL,
  old_value numeric,
  new_value numeric,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_price_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage price adjustments"
ON public.order_price_adjustments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own order adjustments"
ON public.order_price_adjustments
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = order_price_adjustments.order_id
    AND orders.user_id = auth.uid()
));

CREATE INDEX IF NOT EXISTS idx_order_price_adjustments_order_id
  ON public.order_price_adjustments(order_id);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id
  ON public.orders(stripe_payment_intent_id);