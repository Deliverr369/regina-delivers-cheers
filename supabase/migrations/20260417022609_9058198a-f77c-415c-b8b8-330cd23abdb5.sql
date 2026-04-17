
-- Track auto-processing jobs for bulk image uploads
CREATE TABLE public.bulk_image_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, identified, assigned, skipped, error
  identified_name TEXT,
  identified_category TEXT,
  identified_size TEXT,
  is_existing BOOLEAN,
  confidence TEXT,
  final_image_url TEXT,
  product_ids UUID[],
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_bulk_image_jobs_status ON public.bulk_image_jobs(status);
CREATE INDEX idx_bulk_image_jobs_created ON public.bulk_image_jobs(created_at DESC);

ALTER TABLE public.bulk_image_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bulk image jobs"
ON public.bulk_image_jobs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_bulk_image_jobs_updated_at
BEFORE UPDATE ON public.bulk_image_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow admins to upload to the auto-process folder in store-images bucket
CREATE POLICY "Admins can upload bulk auto images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-images'
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can list bulk auto images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'store-images'
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete bulk auto images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-images'
  AND has_role(auth.uid(), 'admin')
);
