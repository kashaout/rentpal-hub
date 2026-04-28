
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

  -- Authorization: tenant, landlord, or admin
  IF NOT (
    _lease.tenant_user_id = auth.uid()
    OR _lease.landlord_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- TEMP (E2E TESTING): show credentials as soon as both parties signed.
  -- Skip credentials_sent_at, lease_end, and 12-hour pre-check-in gate.
  IF NOT (_lease.tenant_signed AND _lease.landlord_signed) THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT lc.wifi_password, lc.keybox_password
  FROM public.lease_credentials lc
  WHERE lc.lease_id = _lease_id;
END;
$function$;
