-- Allow tenants to insert their own tenant record (self-registration after lease signing)
CREATE POLICY "Tenants can create their own record"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow tenants to insert documents (for lease agreement storage)
CREATE POLICY "Tenants can insert documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());