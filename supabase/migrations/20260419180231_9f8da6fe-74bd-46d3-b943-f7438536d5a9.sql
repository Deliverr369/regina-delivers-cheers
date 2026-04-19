CREATE TABLE IF NOT EXISTS public.wine_import_staging (name text PRIMARY KEY, price numeric);
ALTER TABLE public.wine_import_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON public.wine_import_staging FOR ALL USING (has_role(auth.uid(),'admin'));