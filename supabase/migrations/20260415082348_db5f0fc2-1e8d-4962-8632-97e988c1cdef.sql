
-- Fix maintenance-photos INSERT policy to scope uploads by user ID folder prefix
-- This prevents a user from uploading files into another user's folder

DROP POLICY IF EXISTS "Users can upload maintenance photos" ON storage.objects;

CREATE POLICY "Users can upload maintenance photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Also clean up duplicate DELETE policies
DROP POLICY IF EXISTS "Users can delete their maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own maintenance photos" ON storage.objects;

CREATE POLICY "Users can delete their own maintenance photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'maintenance-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);
