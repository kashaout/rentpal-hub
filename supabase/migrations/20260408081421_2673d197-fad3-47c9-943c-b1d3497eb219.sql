-- ============================================
-- FIX 1: Remove tenant self-registration vulnerability
-- Only landlords/admins can create tenant records
-- ============================================
DROP POLICY IF EXISTS "Tenants can create their own record" ON public.tenants;

CREATE POLICY "Landlords can create tenants in their properties"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (
  is_landlord_of_property(auth.uid(), property_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- FIX 2: Replace tenant UPDATE policy on lease_agreements with SECURITY DEFINER RPC
-- ============================================
DROP POLICY IF EXISTS "Tenants can update their own agreements for signing" ON public.lease_agreements;

-- Create a secure RPC for tenant lease signing
CREATE OR REPLACE FUNCTION public.sign_lease_as_tenant(_lease_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Must not already be signed
  IF _lease.tenant_signed THEN
    RAISE EXCEPTION 'Lease already signed by tenant';
  END IF;

  -- Update only signing fields
  UPDATE lease_agreements
  SET tenant_signed = true,
      tenant_signed_at = now(),
      status = CASE 
        WHEN landlord_signed THEN 'active'
        ELSE 'pending_signature'
      END,
      updated_at = now()
  WHERE id = _lease_id;
END;
$$;

-- ============================================
-- FIX 3: Fix maintenance photos UPDATE policy
-- Add folder ownership check
-- ============================================
DROP POLICY IF EXISTS "Users can update their maintenance photos" ON storage.objects;

CREATE POLICY "Users can update their maintenance photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'maintenance-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- ============================================
-- FIX 4: Remove user UPDATE on subscriptions entirely
-- Only admins and service role (via edge functions) should modify
-- ============================================
-- (No user UPDATE policy exists, but ensure no future drift)
-- The restrict_subscription_update trigger already blocks field changes
-- No action needed here - verified no UPDATE policy for non-admins