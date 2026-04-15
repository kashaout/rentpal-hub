-- Fix: Tenants should only see their own documents, not all property documents
DROP POLICY IF EXISTS "Tenants can view documents for their property" ON public.documents;

CREATE POLICY "Tenants can view their own documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = documents.tenant_id
      AND t.user_id = auth.uid()
  )
);