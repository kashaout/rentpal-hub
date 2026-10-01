CREATE OR REPLACE FUNCTION public.stay_end_at(_d date)
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT ((_d + time '12:00') AT TIME ZONE 'Africa/Lagos') $$;

CREATE OR REPLACE FUNCTION public.release_expired_stays()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _l RECORD;
  _leases int := 0;
  _bookings int := 0;
BEGIN
  PERFORM set_config('app.checkout_rpc', 'on', true);

  FOR _l IN
    SELECT * FROM lease_agreements
     WHERE status IN ('active', 'pending_signature')
       AND checked_out_at IS NULL
       AND lease_end IS NOT NULL
       AND stay_end_at(lease_end) <= now()
     FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE lease_agreements
       SET status = 'ended', checked_out_at = now(), updated_at = now()
     WHERE id = _l.id;

    UPDATE tenants
       SET is_archived = true, lease_end = LEAST(lease_end, _l.lease_end), updated_at = now()
     WHERE user_id = _l.tenant_user_id AND property_id = _l.property_id AND is_archived = false;

    UPDATE bookings SET status = 'completed', updated_at = now()
     WHERE user_id = _l.tenant_user_id AND property_id = _l.property_id
       AND check_in = _l.lease_start AND status NOT IN ('completed', 'cancelled');

    IF NOT EXISTS (SELECT 1 FROM tenants WHERE property_id = _l.property_id AND is_archived = false)
       AND NOT EXISTS (
         SELECT 1 FROM lease_agreements
          WHERE property_id = _l.property_id AND id <> _l.id
            AND tenant_signed_at IS NOT NULL AND landlord_signed_at IS NOT NULL
            AND checked_out_at IS NULL AND status <> 'ended') THEN
      UPDATE properties SET is_paused = false, updated_at = now() WHERE id = _l.property_id;
    END IF;

    BEGIN
      INSERT INTO landlord_notifications (landlord_user_id, tenant_user_id, lease_agreement_id, property_id, notification_type, title, message)
      VALUES (_l.landlord_user_id, _l.tenant_user_id, _l.id, _l.property_id, 'tenant_checkout',
              'Stay ended automatically', 'The stay reached its end date without an extension and the unit has been released.');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'release_expired_stays: notification failed for lease %: %', _l.id, SQLERRM;
    END;
    _leases := _leases + 1;
  END LOOP;

  WITH done AS (
    UPDATE bookings SET status = 'completed', updated_at = now()
     WHERE status IN ('pending', 'confirmed')
       AND check_out IS NOT NULL AND stay_end_at(check_out) <= now()
    RETURNING 1)
  SELECT count(*) INTO _bookings FROM done;

  PERFORM set_config('app.checkout_rpc', 'off', true);
  RETURN jsonb_build_object('leases_released', _leases, 'bookings_completed', _bookings);
END;
$$;

REVOKE ALL ON FUNCTION public.release_expired_stays() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_expired_stays() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.extend_stay(_booking_id uuid DEFAULT NULL, _lease_id uuid DEFAULT NULL, _extra_days int DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _end date;
  _l RECORD;
  _hours numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _extra_days IS NULL OR _extra_days < 1 OR _extra_days > 30 THEN
    RAISE EXCEPTION 'You can extend by 1 to 30 days';
  END IF;
  IF (_booking_id IS NULL) = (_lease_id IS NULL) THEN
    RAISE EXCEPTION 'Provide exactly one of booking or lease';
  END IF;

  IF _booking_id IS NOT NULL THEN
    SELECT check_out INTO _end FROM bookings
     WHERE id = _booking_id AND user_id = _uid AND status IN ('pending', 'confirmed') FOR UPDATE;
    IF _end IS NULL THEN RAISE EXCEPTION 'Booking not found or cannot be extended'; END IF;
  ELSE
    SELECT * INTO _l FROM lease_agreements
     WHERE id = _lease_id AND tenant_user_id = _uid AND status = 'active' AND checked_out_at IS NULL FOR UPDATE;
    IF NOT FOUND OR _l.lease_end IS NULL THEN RAISE EXCEPTION 'Lease not found or cannot be extended'; END IF;
    _end := _l.lease_end;
  END IF;

  _hours := extract(epoch FROM (stay_end_at(_end) - now())) / 3600.0;
  IF _hours <= 0 THEN RAISE EXCEPTION 'This stay has already ended and cannot be extended'; END IF;
  IF _hours > 6 THEN RAISE EXCEPTION 'You can only extend within the last 6 hours before checkout'; END IF;

  PERFORM set_config('app.checkout_rpc', 'on', true);
  IF _booking_id IS NOT NULL THEN
    UPDATE bookings SET check_out = _end + _extra_days, updated_at = now() WHERE id = _booking_id;
  ELSE
    UPDATE lease_agreements SET lease_end = _end + _extra_days, updated_at = now() WHERE id = _lease_id;
    UPDATE tenants SET lease_end = _end + _extra_days, updated_at = now()
     WHERE user_id = _uid AND property_id = _l.property_id AND is_archived = false;
    UPDATE bookings SET check_out = _end + _extra_days, updated_at = now()
     WHERE user_id = _uid AND property_id = _l.property_id AND check_in = _l.lease_start
       AND status IN ('pending', 'confirmed');
  END IF;
  PERFORM set_config('app.checkout_rpc', 'off', true);

  RETURN jsonb_build_object('ok', true, 'new_end', _end + _extra_days, 'new_end_at', stay_end_at(_end + _extra_days));
END;
$$;

REVOKE ALL ON FUNCTION public.extend_stay(uuid, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_stay(uuid, uuid, int) TO authenticated;