-- Create storage bucket for store images
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view store images
CREATE POLICY "Public can view store images"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-images');

-- Allow authenticated users to upload store images (for admin functionality)
CREATE POLICY "Authenticated users can upload store images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-images' AND auth.role() = 'authenticated');