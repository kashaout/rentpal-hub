CREATE OR REPLACE FUNCTION public.activate_lease_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _existing_booking_id uuid;
  _wifi text;
  _keybox text;
  _tenant_bridge_id uuid;
BEGIN
  -- 0) Ensure tenants bridge row exists (idempotent) BEFORE any downstream side-effects
  SELECT id INTO _tenant_bridge_id
  FROM tenants
  WHERE user_id = NEW.tenant_user_id
    AND property_id = NEW.property_id
    AND is_archived = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF _tenant_bridge_id IS NULL THEN
    INSERT INTO tenants (
      user_id, property_id, unit_number,
      lease_start, lease_end, rent_amount,
      payment_status, tenant_type
    ) VALUES (
      NEW.tenant_user_id, NEW.property_id, NEW.unit_number,
      NEW.lease_start, NEW.lease_end, NEW.rent_amount,
      'pending', 'long_stay'
    )
    RETURNING id INTO _tenant_bridge_id;
  END IF;

  -- A) Create confirmed booking if one does not already exist for this tenant+property covering this period
  SELECT id INTO _existing_booking_id
  FROM bookings
  WHERE property_id = NEW.property_id
    AND user_id = NEW.tenant_user_id
    AND check_in = NEW.lease_start
    AND check_out = NEW.lease_end
  LIMIT 1;

  IF _existing_booking_id IS NULL THEN
    INSERT INTO bookings (
      property_id, user_id, check_in, check_out,
      total_price, status, payment_status, guest_count, notes
    ) VALUES (
      NEW.property_id, NEW.tenant_user_id, NEW.lease_start, NEW.lease_end,
      COALESCE(NEW.rent_amount, 0), 'confirmed', 'unpaid', 1,
      'Auto-created from lease ' || NEW.id::text
    );
  ELSE
    UPDATE bookings
       SET status = 'confirmed', updated_at = now()
     WHERE id = _existing_booking_id
       AND status <> 'confirmed';
  END IF;

  -- B) Pause property listing
  UPDATE properties SET is_paused = true, updated_at = now()
   WHERE id = NEW.property_id AND (is_paused IS NULL OR is_paused = false);

  -- C) Generate access codes (wifi + keybox) if missing
  IF NOT EXISTS (SELECT 1 FROM lease_credentials WHERE lease_id = NEW.id) THEN
    _wifi := upper(substr(md5(random()::text || NEW.id::text), 1, 10));
    _keybox := lpad((floor(random() * 1000000))::int::text, 6, '0');
    INSERT INTO lease_credentials (lease_id, wifi_password, keybox_password)
    VALUES (NEW.id, _wifi, _keybox);
  END IF;

  -- Mark credentials as sent so tenant can view them
  IF NEW.credentials_sent_at IS NULL THEN
    UPDATE lease_agreements SET credentials_sent_at = now()
     WHERE id = NEW.id AND credentials_sent_at IS NULL;
  END IF;

  -- D) Notify landlord
  INSERT INTO landlord_notifications (
    landlord_user_id, tenant_user_id, lease_agreement_id, property_id,
    notification_type, title, message
  ) VALUES (
    NEW.landlord_user_id, NEW.tenant_user_id, NEW.id, NEW.property_id,
    'lease_activated',
    'Lease fully signed',
    'Lease for property is fully signed. Tenant ready to move in. Access codes generated.'
  );

  -- E) Activate lease
  UPDATE lease_agreements SET status = 'active', updated_at = now()
   WHERE id = NEW.id AND status <> 'active';

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block signing if a side-effect fails; log and continue
  RAISE WARNING 'activate_lease_lifecycle failed for lease %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;