CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid,
  user_id uuid,
  order_id uuid,
  recipient text,
  title text,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'customer',
  status text NOT NULL DEFAULT 'queued',
  twilio_sid text,
  twilio_status text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sms_logs TO authenticated;
GRANT ALL ON public.sms_logs TO service_role;

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sms logs"
ON public.sms_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_sms_logs_created_at ON public.sms_logs (created_at DESC);
CREATE INDEX idx_sms_logs_status ON public.sms_logs (status);

CREATE TRIGGER update_sms_logs_updated_at
BEFORE UPDATE ON public.sms_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();