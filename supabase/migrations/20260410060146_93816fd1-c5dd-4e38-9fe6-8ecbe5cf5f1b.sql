
-- ============================================================
-- 1. UNIQUE ACTIVE VERIFICATION REQUEST CONSTRAINT
-- ============================================================
-- Create a partial unique index: only one pending/additional_info_needed request per user
CREATE UNIQUE INDEX idx_one_active_verification_per_user
ON public.verification_requests (user_id)
WHERE status IN ('pending', 'additional_info_needed');

-- ============================================================
-- 2. PERMISSION VIEWS (derived from verification_requests)
-- ============================================================
CREATE OR REPLACE VIEW public.verified_landlords AS
SELECT DISTINCT user_id
FROM public.verification_requests
WHERE verification_type = 'landlord'
  AND status = 'approved';

CREATE OR REPLACE VIEW public.verified_tenants_short_term AS
SELECT DISTINCT user_id
FROM public.verification_requests
WHERE verification_type = 'tenant_short_term'
  AND status = 'approved';

CREATE OR REPLACE VIEW public.verified_tenants_long_term AS
SELECT DISTINCT user_id
FROM public.verification_requests
WHERE verification_type = 'tenant_long_term'
  AND status = 'approved';

-- Grant SELECT on views to authenticated users
GRANT SELECT ON public.verified_landlords TO authenticated;
GRANT SELECT ON public.verified_tenants_short_term TO authenticated;
GRANT SELECT ON public.verified_tenants_long_term TO authenticated;

-- ============================================================
-- 3. LEASE CREDENTIALS TABLE
-- ============================================================
CREATE TABLE public.lease_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL UNIQUE REFERENCES public.lease_agreements(id) ON DELETE CASCADE,
  wifi_password text,
  keybox_password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS - NO direct user access at all
ALTER TABLE public.lease_credentials ENABLE ROW LEVEL SECURITY;

-- Only admins can directly access (for maintenance). All other access via RPC.
CREATE POLICY "Only admins can access lease_credentials"
ON public.lease_credentials
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous access
CREATE POLICY "Block anonymous access to lease_credentials"
ON public.lease_credentials
FOR SELECT
TO anon
USING (false);

-- Migrate existing credential data from lease_agreements to lease_credentials
INSERT INTO public.lease_credentials (lease_id, wifi_password, keybox_password)
SELECT id, wifi_password, keybox_password
FROM public.lease_agreements
WHERE wifi_password IS NOT NULL OR keybox_password IS NOT NULL;

-- Drop the credential columns from lease_agreements
ALTER TABLE public.lease_agreements DROP COLUMN wifi_password;
ALTER TABLE public.lease_agreements DROP COLUMN keybox_password;

-- Update the get_lease_credentials RPC to use the new table
CREATE OR REPLACE FUNCTION public.get_lease_credentials(_lease_id uuid)
 RETURNS TABLE(wifi_password text, keybox_password text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _lease RECORD;
BEGIN
  SELECT la.* INTO _lease FROM lease_agreements la WHERE la.id = _lease_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lease agreement not found';
  END IF;

  -- Only allow access to tenant or landlord of this lease, or admins
  IF NOT (
    _lease.tenant_user_id = auth.uid()
    OR _lease.landlord_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Only return credentials if both parties signed and credentials have been sent
  IF NOT (_lease.tenant_signed AND _lease.landlord_signed AND _lease.credentials_sent_at IS NOT NULL) THEN
    RETURN;
  END IF;

  -- Only return credentials if within lease period (with 1 day buffer)
  IF CURRENT_DATE > (_lease.lease_end + INTERVAL '1 day')::date THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT lc.wifi_password, lc.keybox_password
  FROM public.lease_credentials lc
  WHERE lc.lease_id = _lease_id;
END;
$function$;

-- Update restrict_tenant_lease_update trigger to remove credential field references
CREATE OR REPLACE FUNCTION public.restrict_tenant_lease_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_user_id = auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) AND NEW.landlord_user_id != auth.uid() THEN
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
    NEW.credentials_sent_at := OLD.credentials_sent_at;
    NEW.check_in_time := OLD.check_in_time;
    NEW.document_id := OLD.document_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update audit_log_changes to remove credential stripping (no longer needed)
CREATE OR REPLACE FUNCTION public.audit_log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  changed_cols text[];
  old_json jsonb;
  new_json jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    SELECT array_agg(key) INTO changed_cols
    FROM jsonb_each(new_json) n
    WHERE n.value IS DISTINCT FROM (old_json -> n.key);
  END IF;

  INSERT INTO public.audit_logs (
    table_name, record_id, action, old_data, new_data, changed_fields, user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    changed_cols,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================================
-- 4. SUBSCRIPTION UPDATE LOCKDOWN
-- ============================================================
-- Drop the existing permissive UPDATE policy that still allows admin updates
-- (the admin ALL policy already covers admin access)
DROP POLICY IF EXISTS "Block all user subscription updates" ON public.subscriptions;

-- Create a RESTRICTIVE policy that blocks ALL non-admin updates
CREATE POLICY "Block all non-admin subscription updates"
ON public.subscriptions
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also update restrict_subscription_update trigger for defense-in-depth
-- (already exists but let's make sure it covers all fields)
CREATE OR REPLACE FUNCTION public.restrict_subscription_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    -- Revert ALL fields - no user modification allowed
    NEW.plan := OLD.plan;
    NEW.property_limit := OLD.property_limit;
    NEW.features := OLD.features;
    NEW.is_active := OLD.is_active;
    NEW.expires_at := OLD.expires_at;
    NEW.started_at := OLD.started_at;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 5. Helper function to check verified status from views
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_verified_landlord(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.verified_landlords WHERE user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_verified_tenant(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.verified_tenants_short_term WHERE user_id = _user_id
    UNION ALL
    SELECT 1 FROM public.verified_tenants_long_term WHERE user_id = _user_id
  )
$$;
