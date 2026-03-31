
-- Import sessions table
CREATE TABLE public.import_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_url text NOT NULL,
  source_domain text,
  import_type text NOT NULL DEFAULT 'product_listing',
  source_name text,
  status text NOT NULL DEFAULT 'scanning',
  total_scanned integer DEFAULT 0,
  approved_count integer DEFAULT 0,
  rejected_count integer DEFAULT 0,
  imported_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Import drafts table (staging/review queue)
CREATE TABLE public.import_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.import_sessions(id) ON DELETE CASCADE,
  source_url text,
  product_name text NOT NULL,
  brand text,
  category text,
  description text,
  imported_image_url text,
  imported_price numeric,
  compare_at_price numeric,
  variant text,
  size text,
  sku text,
  availability text,
  match_status text NOT NULL DEFAULT 'new',
  matched_product_id uuid,
  review_status text NOT NULL DEFAULT 'pending',
  review_notes text,
  assigned_store_ids uuid[] DEFAULT '{}',
  price_action text DEFAULT 'import_as_default',
  image_action text DEFAULT 'import_as_main',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_drafts ENABLE ROW LEVEL SECURITY;

-- RLS policies for import_sessions
CREATE POLICY "Admins can manage import sessions" ON public.import_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for import_drafts
CREATE POLICY "Admins can manage import drafts" ON public.import_drafts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update triggers
CREATE TRIGGER update_import_sessions_updated_at
  BEFORE UPDATE ON public.import_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_import_drafts_updated_at
  BEFORE UPDATE ON public.import_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
