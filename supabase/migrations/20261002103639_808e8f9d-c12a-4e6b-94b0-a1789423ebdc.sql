CREATE OR REPLACE FUNCTION public.release_expired_stays()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _l RECORD;
  _leases int := 0;
  _completed int := 0;
  _cancelled int := 0;
BEGIN
  PERFORM set_config('app.checkout_rpc', 'on', true);

  FOR _l IN
    SELECT * FROM lease_agreements
     WHERE status = 'active'
       AND checked_out_at IS NULL
       AND lease_end IS NOT NULL
       AND stay_end_at(lease_end) <= now()
     FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE lease_agreements
       SET status = 'ended', checked_out_at = stay_end_at(_l.lease_end), updated_at = now()
     WHERE id = _l.id AND checked_out_at IS NULL;

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
     WHERE (status = 'confirmed' OR (status = 'pending' AND payment_status = 'paid'))
       AND check_out IS NOT NULL AND stay_end_at(check_out) <= now()
    RETURNING 1)
  SELECT count(*) INTO _completed FROM done;

  WITH gone AS (
    UPDATE bookings SET status = 'cancelled',
           cancellation_reason = COALESCE(cancellation_reason, 'Stay end passed without payment'),
           updated_at = now()
     WHERE status = 'pending' AND payment_status <> 'paid'
       AND check_out IS NOT NULL AND stay_end_at(check_out) <= now()
    RETURNING 1)
  SELECT count(*) INTO _cancelled FROM gone;

  PERFORM set_config('app.checkout_rpc', 'off', true);
  RETURN jsonb_build_object('leases_released', _leases, 'bookings_completed', _completed, 'bookings_cancelled', _cancelled);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.release_expired_stays() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_stays() TO service_role;