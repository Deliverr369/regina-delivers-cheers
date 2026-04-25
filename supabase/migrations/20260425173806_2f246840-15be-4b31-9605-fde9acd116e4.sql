-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid,
  type text NOT NULL DEFAULT 'order_update',
  title text NOT NULL,
  body text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users see their own
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own as read (update is_read / read_at)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Note: no INSERT policy — only the SECURITY DEFINER trigger function can insert.

-- Trigger function: create notifications on order status change
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
  v_short_id text;
BEGIN
  -- Only act when status actually changes (or on insert)
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_short_id := upper(substr(NEW.id::text, 1, 8));

  CASE NEW.status::text
    WHEN 'pending' THEN
      v_title := 'Order placed ✅';
      v_body  := 'We received your order #' || v_short_id || '. We''ll get shopping shortly!';
    WHEN 'confirmed' THEN
      v_title := 'Order confirmed 👍';
      v_body  := 'Your order #' || v_short_id || ' has been confirmed.';
    WHEN 'shopping' THEN
      v_title := 'Shopper on it 🛒';
      v_body  := 'A shopper is picking your items for order #' || v_short_id || '.';
    WHEN 'out_for_delivery' THEN
      v_title := 'Out for delivery 🚗';
      v_body  := 'Your order #' || v_short_id || ' is on the way!';
    WHEN 'delivered' THEN
      v_title := 'Delivered 🎉';
      v_body  := 'Your order #' || v_short_id || ' has been delivered. Cheers!';
    WHEN 'cancelled' THEN
      v_title := 'Order cancelled';
      v_body  := 'Order #' || v_short_id || ' was cancelled.';
    ELSE
      v_title := 'Order update';
      v_body  := 'Order #' || v_short_id || ' status: ' || NEW.status::text;
  END CASE;

  INSERT INTO public.notifications (user_id, order_id, type, title, body, link)
  VALUES (NEW.user_id, NEW.id, 'order_update', v_title, v_body, '/orders');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_notify_status_change
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;