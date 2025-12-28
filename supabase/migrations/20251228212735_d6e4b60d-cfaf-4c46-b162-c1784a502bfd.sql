-- Create promo_banners table for managing promotional banners
CREATE TABLE public.promo_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  button_text TEXT DEFAULT 'Order Now',
  button_link TEXT DEFAULT '/products',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

-- Anyone can view active banners
CREATE POLICY "Anyone can view active banners"
ON public.promo_banners
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_promo_banners_updated_at
BEFORE UPDATE ON public.promo_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the initial banner
INSERT INTO public.promo_banners (title, subtitle, description, button_text, button_link, is_active, display_order)
VALUES (
  'UNLIMITED',
  'FREE DELIVERY',
  'Order as many times as you want, delivery is free on select items',
  'ORDER NOW',
  '/products',
  true,
  1
);