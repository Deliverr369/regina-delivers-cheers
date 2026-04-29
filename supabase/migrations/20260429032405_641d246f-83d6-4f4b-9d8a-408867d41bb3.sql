-- 1) Create a server-only billing table to hold the Stripe customer id
CREATE TABLE public.customer_billing (
  user_id uuid PRIMARY KEY,
  stripe_customer_id text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_billing ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated.
-- Only the service role (used by edge functions) bypasses RLS and can access this table.

CREATE TRIGGER update_customer_billing_updated_at
BEFORE UPDATE ON public.customer_billing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Migrate any existing stripe_customer_id values out of profiles
INSERT INTO public.customer_billing (user_id, stripe_customer_id)
SELECT id, stripe_customer_id
FROM public.profiles
WHERE stripe_customer_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET stripe_customer_id = EXCLUDED.stripe_customer_id;

-- 3) Drop the column from the user-readable profiles table
ALTER TABLE public.profiles DROP COLUMN stripe_customer_id;

-- 4) Tighten profiles RLS: restrict to authenticated role only
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);