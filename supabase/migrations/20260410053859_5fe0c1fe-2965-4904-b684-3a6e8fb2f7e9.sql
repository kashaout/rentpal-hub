-- 1. Revoke SELECT on sensitive credential columns from authenticated role
-- Only the SECURITY DEFINER RPC get_lease_credentials can return these
REVOKE SELECT (wifi_password, keybox_password) ON public.lease_agreements FROM authenticated;
REVOKE SELECT (wifi_password, keybox_password) ON public.lease_agreements FROM anon;

-- 2. Add RESTRICTIVE policy to block tenant UPDATEs on lease_agreements
-- The existing trigger restrict_tenant_lease_update handles field-level protection,
-- but a RESTRICTIVE policy is cleaner and prevents any tenant UPDATE attempt
CREATE POLICY "Block tenant updates on lease_agreements"
ON public.lease_agreements
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  -- Allow if user is NOT the tenant, OR if user is admin
  -- This means: tenants are blocked, landlords/admins can update
  tenant_user_id != auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR landlord_user_id = auth.uid()
);

-- 3. Add RESTRICTIVE policies on user_roles to prevent non-admin UPDATE and DELETE
CREATE POLICY "Block non-admin role updates"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block non-admin role deletes"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));