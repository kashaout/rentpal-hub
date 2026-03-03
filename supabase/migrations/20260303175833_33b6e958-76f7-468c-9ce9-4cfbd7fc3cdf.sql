CREATE POLICY "Tenants can create lease agreements"
ON public.lease_agreements
FOR INSERT
TO authenticated
WITH CHECK (tenant_user_id = auth.uid());