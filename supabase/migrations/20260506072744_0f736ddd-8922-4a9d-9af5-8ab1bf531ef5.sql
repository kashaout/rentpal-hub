
-- Lease activation lifecycle: fires when both parties have signed.
CREATE OR REPLACE FUNCTION public.activate_lease_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_booking_id uuid;
  _wifi text;
  _keybox text;
BEGIN
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

  -- D) Notify landlord (tenant notifications use landlord_notifications schema; skip if not landlord-applicable)
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
$$;

DROP TRIGGER IF EXISTS lease_activation_trigger ON public.lease_agreements;
CREATE TRIGGER lease_activation_trigger
AFTER UPDATE ON public.lease_agreements
FOR EACH ROW
WHEN (
  NEW.tenant_signed = true
  AND NEW.landlord_signed = true
  AND OLD.status IS DISTINCT FROM 'active'
)
EXECUTE FUNCTION public.activate_lease_lifecycle();
