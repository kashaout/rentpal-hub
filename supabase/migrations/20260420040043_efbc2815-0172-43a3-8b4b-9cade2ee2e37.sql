-- 1) Tenant can create maintenance requests for any property they hold an active lease on
CREATE POLICY "Tenant can create maintenance for leased property"
ON public.maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (
  property_id IN (
    SELECT property_id FROM public.active_tenants
    WHERE tenant_user_id = auth.uid()
  )
);

-- 2) Tenant can create general tenant requests for any property they hold an active lease on
CREATE POLICY "Tenant can create tenant requests for leased property"
ON public.tenant_requests
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_user_id = auth.uid()
  AND property_id IN (
    SELECT property_id FROM public.active_tenants
    WHERE tenant_user_id = auth.uid()
  )
);

-- 3) Update get_lease_credentials to enforce the 12-hour-before-check-in rule
--    Codes must only be returned when:
--      - both signatures present
--      - credentials_sent_at is set
--      - current time is within 12 hours BEFORE check-in datetime, or after check-in (during stay)
--      - lease is still within window
CREATE OR REPLACE FUNCTION public.get_lease_credentials(_lease_id uuid)
RETURNS TABLE(wifi_password text, keybox_password text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _lease RECORD;
  _check_in_ts timestamptz;
BEGIN
  SELECT la.* INTO _lease FROM lease_agreements la WHERE la.id = _lease_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lease agreement not found';
  END IF;

  -- Authorization: tenant, landlord, or admin
  IF NOT (
    _lease.tenant_user_id = auth.uid()
    OR _lease.landlord_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Both parties must have signed AND credentials must have been provisioned
  IF NOT (_lease.tenant_signed AND _lease.landlord_signed AND _lease.credentials_sent_at IS NOT NULL) THEN
    RETURN;
  END IF;

  -- Lease window check (with 1-day buffer after end)
  IF CURRENT_DATE > (_lease.lease_end + INTERVAL '1 day')::date THEN
    RETURN;
  END IF;

  -- 12-hour gating: codes only visible <= 12 hours before check-in (and during the stay)
  -- Use lease_agreements.check_in_time when present, otherwise fall back to lease_start at 14:00 local
  _check_in_ts := COALESCE(
    _lease.check_in_time,
    (_lease.lease_start::timestamp + INTERVAL '14 hours') AT TIME ZONE 'UTC'
  );

  -- Landlord and admin always see them (so they can manage); tenants gated by 12-hour window
  IF _lease.tenant_user_id = auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    IF now() < (_check_in_ts - INTERVAL '12 hours') THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT lc.wifi_password, lc.keybox_password
  FROM public.lease_credentials lc
  WHERE lc.lease_id = _lease_id;
END;
$function$;