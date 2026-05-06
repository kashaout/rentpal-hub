DROP POLICY IF EXISTS "Tenants can create lease agreements" ON public.lease_agreements;
CREATE POLICY "Tenants can create lease agreements"
ON public.lease_agreements
FOR INSERT
TO authenticated
WITH CHECK (tenant_user_id = auth.uid());

DROP POLICY IF EXISTS "Tenants can sign their lease" ON public.lease_agreements;
CREATE POLICY "Tenants can sign their lease"
ON public.lease_agreements
FOR UPDATE
TO authenticated
USING (tenant_user_id = auth.uid())
WITH CHECK (tenant_user_id = auth.uid());

DROP POLICY IF EXISTS "Landlords can sign leases for their properties" ON public.lease_agreements;
CREATE POLICY "Landlords can sign leases for their properties"
ON public.lease_agreements
FOR UPDATE
TO authenticated
USING (landlord_user_id = auth.uid())
WITH CHECK (landlord_user_id = auth.uid());

DROP POLICY IF EXISTS "Tenants can view their leases" ON public.lease_agreements;
CREATE POLICY "Tenants can view their leases"
ON public.lease_agreements
FOR SELECT
TO authenticated
USING (tenant_user_id = auth.uid());

DROP POLICY IF EXISTS "Landlords can view leases on their properties" ON public.lease_agreements;
CREATE POLICY "Landlords can view leases on their properties"
ON public.lease_agreements
FOR SELECT
TO authenticated
USING (landlord_user_id = auth.uid());