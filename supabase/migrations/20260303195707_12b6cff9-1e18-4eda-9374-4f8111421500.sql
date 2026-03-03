
-- Trigger function: auto-create a document record when a lease agreement becomes fully signed
CREATE OR REPLACE FUNCTION public.auto_create_lease_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _prop RECORD;
  _doc_id uuid;
BEGIN
  -- Only fire when both parties have now signed (transition to fully signed)
  IF NEW.tenant_signed = true AND NEW.landlord_signed = true
     AND (OLD.tenant_signed = false OR OLD.landlord_signed = false) THEN
    
    -- Get property info
    SELECT name INTO _prop FROM properties WHERE id = NEW.property_id;

    -- Create document record for the landlord
    INSERT INTO documents (
      name, file_path, file_type, file_size, category, property_id, uploaded_by
    ) VALUES (
      'Lease Agreement - ' || COALESCE(_prop.name, 'Property') || ' - Unit ' || NEW.unit_number || ' (' || NEW.tenant_name || ')',
      'auto-generated/lease-' || NEW.id::text,
      'pdf',
      0,
      'Lease Agreement',
      NEW.property_id,
      NEW.landlord_user_id
    )
    RETURNING id INTO _doc_id;

    -- Link document back to lease agreement
    UPDATE lease_agreements SET document_id = _doc_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to lease_agreements
DROP TRIGGER IF EXISTS trg_auto_create_lease_document ON lease_agreements;
CREATE TRIGGER trg_auto_create_lease_document
  AFTER UPDATE ON lease_agreements
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_lease_document();

-- Trigger function: auto-create a document record when a booking is confirmed
CREATE OR REPLACE FUNCTION public.auto_create_booking_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _prop RECORD;
  _landlord_id uuid;
BEGIN
  -- Only fire on transition to 'confirmed'
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    
    SELECT name, landlord_id INTO _prop FROM properties WHERE id = NEW.property_id;
    _landlord_id := COALESCE(_prop.landlord_id, NEW.user_id);

    INSERT INTO documents (
      name, file_path, file_type, file_size, category, property_id, uploaded_by
    ) VALUES (
      'Booking Confirmation - ' || COALESCE(_prop.name, 'Property') || ' (' || NEW.check_in::text || ' to ' || NEW.check_out::text || ')',
      'auto-generated/booking-' || NEW.id::text,
      'pdf',
      0,
      'Other',
      NEW.property_id,
      _landlord_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to bookings
DROP TRIGGER IF EXISTS trg_auto_create_booking_document ON bookings;
CREATE TRIGGER trg_auto_create_booking_document
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_booking_document();

-- Also handle INSERT for bookings that are created directly as 'confirmed'
DROP TRIGGER IF EXISTS trg_auto_create_booking_document_insert ON bookings;
CREATE TRIGGER trg_auto_create_booking_document_insert
  AFTER INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION auto_create_booking_document();
