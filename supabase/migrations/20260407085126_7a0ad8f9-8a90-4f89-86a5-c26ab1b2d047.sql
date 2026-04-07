
-- 1. Fix tenant UPDATE policy on lease_agreements: restrict to signing columns only
DROP POLICY IF EXISTS "Tenants can update their own agreements for signing" ON public.lease_agreements;
CREATE POLICY "Tenants can update their own agreements for signing"
ON public.lease_agreements
FOR UPDATE
TO authenticated
USING (tenant_user_id = auth.uid())
WITH CHECK (
  tenant_user_id = auth.uid()
  AND tenant_signed = true
  AND tenant_signed_at IS NOT NULL
);

-- Add a trigger to prevent tenants from modifying non-signing columns
CREATE OR REPLACE FUNCTION public.restrict_tenant_lease_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the updater is the tenant (not landlord/admin), only allow signing fields to change
  IF NEW.tenant_user_id = auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) AND NEW.landlord_user_id != auth.uid() THEN
    -- Revert all non-signing fields to OLD values
    NEW.rent_amount := OLD.rent_amount;
    NEW.lease_start := OLD.lease_start;
    NEW.lease_end := OLD.lease_end;
    NEW.currency := OLD.currency;
    NEW.unit_number := OLD.unit_number;
    NEW.landlord_name := OLD.landlord_name;
    NEW.tenant_name := OLD.tenant_name;
    NEW.landlord_user_id := OLD.landlord_user_id;
    NEW.tenant_user_id := OLD.tenant_user_id;
    NEW.property_id := OLD.property_id;
    NEW.terms := OLD.terms;
    NEW.status := OLD.status;
    NEW.landlord_signed := OLD.landlord_signed;
    NEW.landlord_signed_at := OLD.landlord_signed_at;
    NEW.wifi_password := OLD.wifi_password;
    NEW.keybox_password := OLD.keybox_password;
    NEW.credentials_sent_at := OLD.credentials_sent_at;
    NEW.check_in_time := OLD.check_in_time;
    NEW.document_id := OLD.document_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restrict_tenant_lease_update
  BEFORE UPDATE ON public.lease_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_tenant_lease_update();

-- 2. Fix escrow_transactions INSERT: require valid booking relationship
DROP POLICY IF EXISTS "Tenants can create escrow transactions" ON public.escrow_transactions;
CREATE POLICY "Tenants can create escrow transactions"
ON public.escrow_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM bookings b
    JOIN properties p ON p.id = b.property_id
    WHERE b.id = escrow_transactions.booking_id
    AND b.user_id = auth.uid()
    AND b.property_id = escrow_transactions.property_id
    AND p.landlord_id = escrow_transactions.landlord_user_id
  )
);

-- 3. Fix tenant-verification storage: restrict landlords to only their tenants' files
DROP POLICY IF EXISTS "Landlords can view tenant verification files" ON storage.objects;
CREATE POLICY "Landlords can view tenant verification files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-verification'
  AND has_role(auth.uid(), 'landlord'::app_role)
  AND EXISTS (
    SELECT 1 FROM tenants t
    JOIN properties p ON p.id = t.property_id
    WHERE p.landlord_id = auth.uid()
    AND t.user_id::text = (storage.foldername(name))[1]
  )
);

-- 4. Fix user_roles: move initial role assignment to a trigger instead of RLS INSERT
-- Drop the current INSERT policy
DROP POLICY IF EXISTS "Users can self-assign initial role during signup" ON public.user_roles;

-- Create a SECURITY DEFINER function for role assignment during signup
CREATE OR REPLACE FUNCTION public.assign_initial_role(_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow landlord or tenant
  IF _role NOT IN ('landlord'::app_role, 'tenant'::app_role) THEN
    RAISE EXCEPTION 'Only landlord or tenant roles can be self-assigned';
  END IF;

  -- Only allow if user has no existing roles
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already has a role assigned';
  END IF;

  INSERT INTO user_roles (user_id, role) VALUES (auth.uid(), _role);
END;
$$;
