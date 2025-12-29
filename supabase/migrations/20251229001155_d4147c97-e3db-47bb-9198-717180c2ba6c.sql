-- Create a table for beer pack pricing
CREATE TABLE public.beer_pack_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  pack_size TEXT NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, pack_size)
);

-- Enable Row Level Security
ALTER TABLE public.beer_pack_prices ENABLE ROW LEVEL SECURITY;

-- Create policies - anyone can view prices, only admins can modify
CREATE POLICY "Anyone can view beer pack prices" 
ON public.beer_pack_prices 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert beer pack prices" 
ON public.beer_pack_prices 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update beer pack prices" 
ON public.beer_pack_prices 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete beer pack prices" 
ON public.beer_pack_prices 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_beer_pack_prices_updated_at
BEFORE UPDATE ON public.beer_pack_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();