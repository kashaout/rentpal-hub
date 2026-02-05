-- Fix documents storage bucket access controls
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view documents they have access to" ON storage.objects;

-- Admin access - can view all documents
CREATE POLICY "Admins can view all documents in storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Landlord access - can view documents they uploaded or in their properties
CREATE POLICY "Landlords can view documents in their properties"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (
    -- Owner of the upload (folder structure: user_id/filename)
    auth.uid()::text = (storage.foldername(storage.objects.name))[1]
    OR
    -- Has access via property ownership
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.properties p ON p.id = d.property_id
      WHERE d.file_path = storage.objects.name
      AND p.landlord_id = auth.uid()
    )
  )
);

-- Consultant access - documents in assigned properties or own uploads
CREATE POLICY "Consultants can view documents in assigned properties"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (
    auth.uid()::text = (storage.foldername(storage.objects.name))[1]
    OR
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.file_path = storage.objects.name
      AND public.is_consultant_for_property(auth.uid(), d.property_id)
    )
  )
);

-- Tenant access - documents for their property only
CREATE POLICY "Tenants can view documents for their property"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.tenants t ON t.property_id = d.property_id
    WHERE d.file_path = storage.objects.name
    AND t.user_id = auth.uid()
  )
);

-- Add index on documents.file_path for performance
CREATE INDEX IF NOT EXISTS idx_documents_file_path ON public.documents(file_path);