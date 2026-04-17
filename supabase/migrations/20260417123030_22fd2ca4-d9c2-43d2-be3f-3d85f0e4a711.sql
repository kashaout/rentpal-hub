
-- 1) Drop existing INSERT/UPDATE policies on lease_agreements that we will replace
DROP POLICY IF EXISTS "Landlords can create lease agreements" ON public.lease_agreements;
DROP POLICY IF EXISTS "Landlords can create lease agreements for their property" ON public.lease_agreements;
DROP POLICY IF EXISTS "Tenants can create lease agreements for booking flow" ON public.lease_agreements;
DROP POLICY IF EXISTS "Tenant can sign lease only" ON public.lease_agreements;
DROP POLICY IF EXISTS "Landlord can sign lease only" ON public.lease_agreements;
DROP POLICY IF EXISTS "Block tenant updates on lease_agreements" ON public.lease_agreements;
DROP POLICY IF EXISTS "Landlords can manage their lease agreements" ON public.lease_agreements;

-- 2) INSERT: Landlord of the property can create a lease (per spec)
CREATE POLICY "Landlords can create lease agreements for their property"
ON public.lease_agreements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = lease_agreements.property_id
      AND properties.landlord_id = auth.uid()
  )
);

-- 3) INSERT: Tenant booking flow — a tenant may create their own lease record
-- (the landlord must counter-sign it for activation; the restrict_tenant_lease_update
-- trigger and the auto_create_lease_document trigger enforce integrity)
CREATE POLICY "Tenants can create their own lease agreement"
ON public.lease_agreements
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = lease_agreements.property_id
      AND p.landlord_id = lease_agreements.landlord_user_id
      AND p.is_archived = false
      AND (p.is_paused = false OR p.is_paused IS NULL)
  )
);

-- 4) UPDATE: Landlord of the property can update / countersign their lease
-- (only blocked if landlord_signed is already true is enforced in app + RPC)
CREATE POLICY "Landlord can sign lease"
ON public.lease_agreements
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = lease_agreements.property_id
      AND properties.landlord_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = lease_agreements.property_id
      AND properties.landlord_id = auth.uid()
  )
);

-- 5) UPDATE: Tenant can sign their own lease (signing-only fields are protected
-- by the existing restrict_tenant_lease_update trigger)
CREATE POLICY "Tenant can sign lease only"
ON public.lease_agreements
FOR UPDATE
TO authenticated
USING (tenant_user_id = auth.uid())
WITH CHECK (tenant_user_id = auth.uid());

-- 6) Replace the tenant signing RPC: sign only if tenant_signed_at IS NULL
-- and a lease is fully signed only when BOTH tenant_signed_at and
-- landlord_signed_at are NOT NULL.
CREATE OR REPLACE FUNCTION public.sign_lease_as_tenant(_lease_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _lease RECORD;
BEGIN
  SELECT * INTO _lease FROM lease_agreements WHERE id = _lease_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lease agreement not found';
  END IF;

  -- Only the tenant of this lease can sign
  IF _lease.tenant_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: you are not the tenant on this lease';
  END IF;

  -- Tenant can sign only if they have not signed yet (use timestamp as source of truth)
  IF _lease.tenant_signed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Lease already signed by tenant';
  END IF;

  -- Update only signing fields. Lease is "active" only when BOTH parties have signed.
  UPDATE lease_agreements
  SET tenant_signed = true,
      tenant_signed_at = now(),
      status = CASE
        WHEN landlord_signed_at IS NOT NULL THEN 'active'
        ELSE 'pending_signature'
      END,
      updated_at = now()
  WHERE id = _lease_id;
END;
$function$;
