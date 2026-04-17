
-- Fix cross-tenant document exposure in storage
DROP POLICY IF EXISTS "Tenants can view documents for their property" ON storage.objects;

CREATE POLICY "Tenants can view their own documents only"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- Owner-uploaded path (file is under their user folder)
    (auth.uid())::text = (storage.foldername(name))[1]
    OR
    -- Document row is explicitly attached to a tenants row owned by them,
    -- OR was uploaded by them
    EXISTS (
      SELECT 1 FROM public.documents d
      LEFT JOIN public.tenants t ON t.id = d.tenant_id
      WHERE d.file_path = storage.objects.name
        AND (
          d.uploaded_by = auth.uid()
          OR (d.tenant_id IS NOT NULL AND t.user_id = auth.uid())
        )
    )
  )
);
