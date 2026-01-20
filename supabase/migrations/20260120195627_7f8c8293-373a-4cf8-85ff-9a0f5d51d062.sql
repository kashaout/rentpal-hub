-- Add repair notes and photo URLs to maintenance requests
ALTER TABLE public.maintenance_requests
ADD COLUMN repair_notes text,
ADD COLUMN photo_urls text[] DEFAULT '{}';

-- Create storage bucket for maintenance photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-photos', 'maintenance-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to maintenance-photos bucket
CREATE POLICY "Authenticated users can upload maintenance photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-photos');

-- Allow authenticated users to view maintenance photos
CREATE POLICY "Authenticated users can view maintenance photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-photos');

-- Allow maintenance users to delete photos they uploaded
CREATE POLICY "Users can delete their own maintenance photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);