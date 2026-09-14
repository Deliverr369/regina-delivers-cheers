CREATE OR REPLACE FUNCTION public.get_order_amounts(_order_id uuid)
RETURNS TABLE(
  subtotal numeric,
  delivery_fee numeric,
  convenience_fee numeric,
  tax numeric,
  discount numeric,
  tip numeric,
  total numeric,
  is_final boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o public.orders%ROWTYPE;
  v_rate numeric := 0;
  v_sub numeric;
  v_tax numeric;
  v_del numeric;
  v_conv numeric;
  v_disc numeric;
  v_total numeric;
  v_final boolean;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN;
  END IF;

  v_final := o.final_total IS NOT NULL AND o.final_total > 0;
  v_del   := round(COALESCE(o.delivery_fee, 0), 2);
  v_conv  := round(COALESCE(o.convenience_fee, 0), 2);
  v_disc  := round(COALESCE(o.discount_amount, 0), 2);
  v_total := round(COALESCE(CASE WHEN v_final THEN o.final_total ELSE o.total END, 0), 2);

  IF COALESCE(o.subtotal, 0) > 0 THEN
    v_rate := COALESCE(o.tax, 0) / o.subtotal;
  END IF;

  IF v_final AND COALESCE(o.final_subtotal, 0) > 0 THEN
    -- final_subtotal is the store receipt total, tax included: split it back out
    v_tax := round((o.final_subtotal * v_rate) / (1 + v_rate), 2);
    v_sub := round(o.final_subtotal - v_tax, 2);
  ELSE
    v_sub := round(COALESCE(o.subtotal, 0), 2);
    v_tax := round(COALESCE(o.tax, 0), 2);
  END IF;

  RETURN QUERY SELECT
    v_sub,
    v_del,
    v_conv,
    v_tax,
    v_disc,
    GREATEST(0, round(v_total - (v_sub + v_del + v_conv + v_tax - v_disc), 2)),
    v_total,
    v_final;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_order_amounts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_order_amounts(uuid) TO authenticated, service_role;