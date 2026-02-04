-- Drop existing policies first, then recreate
DROP POLICY IF EXISTS "Authenticated users can view maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Maintenance photos are publicly accessible" ON storage.objects;

-- Fix 1: Make maintenance-photos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'maintenance-photos';

-- Allow authenticated users with proper access to view maintenance photos
CREATE POLICY "Authenticated users can view maintenance photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'maintenance-photos' AND
  (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'maintenance') OR
    public.has_role(auth.uid(), 'landlord') OR
    public.has_role(auth.uid(), 'consultant') OR
    public.has_role(auth.uid(), 'tenant')
  )
);

-- Allow authenticated users to upload maintenance photos
CREATE POLICY "Authenticated users can upload maintenance photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-photos' AND
  (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'maintenance') OR
    public.has_role(auth.uid(), 'landlord') OR
    public.has_role(auth.uid(), 'consultant') OR
    public.has_role(auth.uid(), 'tenant')
  )
);

-- Allow users to update their own uploads
CREATE POLICY "Users can update their maintenance photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'maintenance-photos' AND
  (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'maintenance') OR
    (owner_id::text = auth.uid()::text)
  )
);

-- Allow users to delete their own uploads or admins
CREATE POLICY "Users can delete their maintenance photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'maintenance-photos' AND
  (
    public.has_role(auth.uid(), 'admin') OR
    (owner_id::text = auth.uid()::text)
  )
);

-- Fix 3: Drop the overly permissive audit_logs INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Block all direct user inserts - triggers use SECURITY DEFINER and bypass RLS
CREATE POLICY "Block all user inserts to audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (false);