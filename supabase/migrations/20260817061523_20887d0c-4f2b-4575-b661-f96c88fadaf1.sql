-- 1) Actual move-out timestamp
ALTER TABLE public.lease_agreements
  ADD COLUMN IF NOT EXISTS checked_out_at timestamp with time zone;

-- 2) active_tenants must exclude ended / checked-out leases
CREATE OR REPLACE VIEW public.active_tenants AS
  SELECT tenant_user_id,
         property_id,
         id AS lease_id,
         landlord_user_id,
         lease_start,
         lease_end,
         tenant_signed_at,
         landlord_signed_at
  FROM public.lease_agreements
  WHERE tenant_signed_at IS NOT NULL
    AND landlord_signed_at IS NOT NULL
    AND checked_out_at IS NULL
    AND status <> 'ended';

GRANT SELECT ON public.active_tenants TO authenticated;
GRANT ALL ON public.active_tenants TO service_role;

-- 3) Allow the checkout RPC to change lease status/checked_out_at despite
--    the signature/tenant guard triggers (RPC does its own authorization).
CREATE OR REPLACE FUNCTION public.restrict_lease_signature_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF coalesce(current_setting('app.checkout_rpc', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF _uid IS NULL OR has_role(_uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.id               := OLD.id;
  NEW.property_id      := OLD.property_id;
  NEW.tenant_user_id   := OLD.tenant_user_id;
  NEW.landlord_user_id := OLD.landlord_user_id;
  NEW.tenant_name      := OLD.tenant_name;
  NEW.landlord_name    := OLD.landlord_name;
  NEW.unit_number      := OLD.unit_number;
  NEW.rent_amount      := OLD.rent_amount;
  NEW.currency         := OLD.currency;
  NEW.lease_start      := OLD.lease_start;
  NEW.lease_end        := OLD.lease_end;
  NEW.terms            := OLD.terms;
  NEW.created_at       := OLD.created_at;
  NEW.checked_out_at   := OLD.checked_out_at;

  IF _uid = OLD.tenant_user_id AND _uid IS DISTINCT FROM OLD.landlord_user_id THEN
    NEW.landlord_signed    := OLD.landlord_signed;
    NEW.landlord_signed_at := OLD.landlord_signed_at;
  ELSIF _uid = OLD.landlord_user_id THEN
    NEW.tenant_signed    := OLD.tenant_signed;
    NEW.tenant_signed_at := OLD.tenant_signed_at;
  END IF;

  IF OLD.tenant_signed_at IS NOT NULL THEN
    NEW.tenant_signed    := true;
    NEW.tenant_signed_at := OLD.tenant_signed_at;
  END IF;
  IF OLD.landlord_signed_at IS NOT NULL THEN
    NEW.landlord_signed    := true;
    NEW.landlord_signed_at := OLD.landlord_signed_at;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restrict_tenant_lease_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(current_setting('app.checkout_rpc', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

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
    NEW.checked_out_at := OLD.checked_out_at;
  END IF;
  RETURN NEW;
END;
$function$;

-- Bookings guard must allow the checkout RPC to complete a booking
CREATE OR REPLACE FUNCTION public.restrict_booking_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_admin boolean := has_role(auth.uid(), 'admin'::app_role);
  _is_landlord boolean := is_landlord_of_property(auth.uid(), OLD.property_id);
BEGIN
  IF coalesce(current_setting('app.checkout_rpc', true), '') = 'on' OR _is_admin THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.property_id := OLD.property_id;
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;

  IF NOT _is_landlord THEN
    NEW.total_price        := OLD.total_price;
    NEW.original_price     := OLD.original_price;
    NEW.discount_amount    := OLD.discount_amount;
    NEW.final_price        := OLD.final_price;
    NEW.pricing_rule_id    := OLD.pricing_rule_id;
    NEW.payment_status     := OLD.payment_status;
    NEW.payout_status      := OLD.payout_status;
    NEW.payout_released_at := OLD.payout_released_at;
    NEW.check_in           := OLD.check_in;
    NEW.check_out          := OLD.check_out;
    NEW.expires_at         := OLD.expires_at;
    NEW.soft_lock_expires_at := OLD.soft_lock_expires_at;
    NEW.is_soft_lock       := OLD.is_soft_lock;
    NEW.dispute_id         := OLD.dispute_id;

    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
      NEW.status := OLD.status;
    END IF;
  ELSE
    NEW.total_price     := OLD.total_price;
    NEW.original_price  := OLD.original_price;
    NEW.discount_amount := OLD.discount_amount;
    NEW.final_price     := OLD.final_price;
    NEW.pricing_rule_id := OLD.pricing_rule_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) Atomic checkout RPC
CREATE OR REPLACE FUNCTION public.rpc_complete_checkout(
  _lease_id uuid,
  _checkout_at timestamp with time zone DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _lease RECORD;
  _authorized boolean := false;
  _tenants_closed int := 0;
  _bookings_closed int := 0;
  _released boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _lease FROM lease_agreements WHERE id = _lease_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lease not found';
  END IF;

  _authorized :=
       _uid = _lease.tenant_user_id
    OR _uid = _lease.landlord_user_id
    OR has_role(_uid, 'admin'::app_role)
    OR is_consultant_for_property(_uid, _lease.property_id);

  IF NOT _authorized THEN
    RAISE EXCEPTION 'Not authorized to check out this tenancy';
  END IF;

  IF _lease.checked_out_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'already_checked_out', true,
      'lease_id', _lease.id,
      'checked_out_at', _lease.checked_out_at
    );
  END IF;

  PERFORM set_config('app.checkout_rpc', 'on', true);

  -- a) End the lease + record move-out date
  UPDATE lease_agreements
     SET status = 'ended',
         checked_out_at = COALESCE(_checkout_at, now()),
         updated_at = now()
   WHERE id = _lease.id;

  -- b) Close the tenancy bridge row(s) (this releases the property via
  --    unlock_property_on_tenant_archive when no other active tenant remains)
  WITH closed AS (
    UPDATE tenants
       SET is_archived = true,
           lease_end = LEAST(lease_end, COALESCE(_checkout_at, now())::date),
           updated_at = now()
     WHERE user_id = _lease.tenant_user_id
       AND property_id = _lease.property_id
       AND is_archived = false
    RETURNING 1
  )
  SELECT count(*) INTO _tenants_closed FROM closed;

  -- c) Complete the related booking(s) — historical rows preserved
  WITH done AS (
    UPDATE bookings
       SET status = 'completed', updated_at = now()
     WHERE user_id = _lease.tenant_user_id
       AND property_id = _lease.property_id
       AND check_in = _lease.lease_start
       AND status NOT IN ('completed', 'cancelled')
    RETURNING 1
  )
  SELECT count(*) INTO _bookings_closed FROM done;

  -- d) Release the property if no active tenancy remains (idempotent safety net)
  IF NOT EXISTS (
    SELECT 1 FROM tenants
     WHERE property_id = _lease.property_id
       AND is_archived = false
  ) AND NOT EXISTS (
    SELECT 1 FROM lease_agreements
     WHERE property_id = _lease.property_id
       AND id <> _lease.id
       AND tenant_signed_at IS NOT NULL
       AND landlord_signed_at IS NOT NULL
       AND checked_out_at IS NULL
       AND status <> 'ended'
  ) THEN
    UPDATE properties
       SET is_paused = false, updated_at = now()
     WHERE id = _lease.property_id;
    _released := true;
  END IF;

  BEGIN
    INSERT INTO landlord_notifications (
      landlord_user_id, tenant_user_id, lease_agreement_id, property_id,
      notification_type, title, message
    ) VALUES (
      _lease.landlord_user_id, _lease.tenant_user_id, _lease.id, _lease.property_id,
      'tenant_checkout',
      'Tenant checked out',
      'The tenancy has ended and the unit has been released for re-listing.'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'rpc_complete_checkout: notification failed for lease %: %', _lease.id, SQLERRM;
  END;

  PERFORM set_config('app.checkout_rpc', 'off', true);

  RETURN jsonb_build_object(
    'lease_id', _lease.id,
    'property_id', _lease.property_id,
    'checked_out_at', COALESCE(_checkout_at, now()),
    'tenancies_closed', _tenants_closed,
    'bookings_completed', _bookings_closed,
    'property_released', _released
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_complete_checkout(uuid, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_complete_checkout(uuid, timestamp with time zone) TO authenticated;

-- 5) Repair stale occupancy: paused properties with no active tenancy
UPDATE public.properties p
   SET is_paused = false, updated_at = now()
 WHERE p.is_paused = true
   AND NOT EXISTS (
     SELECT 1 FROM public.tenants t
      WHERE t.property_id = p.id AND t.is_archived = false
   )
   AND NOT EXISTS (
     SELECT 1 FROM public.lease_agreements l
      WHERE l.property_id = p.id
        AND l.tenant_signed_at IS NOT NULL
        AND l.landlord_signed_at IS NOT NULL
        AND l.checked_out_at IS NULL
        AND l.status <> 'ended'
   );