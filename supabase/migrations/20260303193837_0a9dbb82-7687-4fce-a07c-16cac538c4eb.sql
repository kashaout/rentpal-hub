
-- Auto-dispatch function: find best available technician/vendor for a work order
CREATE OR REPLACE FUNCTION public.auto_dispatch_work_order(_work_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _wo RECORD;
  _assigned_user_id uuid;
BEGIN
  SELECT * INTO _wo FROM work_orders WHERE id = _work_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Work order not found'; END IF;
  
  -- Find maintenance user with lowest current workload and best performance
  SELECT ur.user_id INTO _assigned_user_id
  FROM user_roles ur
  JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('maintenance', 'vendor')
  ORDER BY
    -- Lowest active workload
    (SELECT count(*) FROM work_orders wo2 
     WHERE wo2.assigned_to = ur.user_id 
     AND wo2.status NOT IN ('closed', 'verified', 'completed')) ASC,
    -- Best performance score
    COALESCE(p.technician_performance_score, 50) DESC,
    -- Random tiebreaker
    random()
  LIMIT 1;
  
  IF _assigned_user_id IS NOT NULL THEN
    UPDATE work_orders 
    SET assigned_to = _assigned_user_id, status = 'assigned'
    WHERE id = _work_order_id AND status = 'created';
    
    INSERT INTO maintenance_logs (work_order_id, user_id, action, new_status, previous_status, details)
    VALUES (_work_order_id, _assigned_user_id, 'auto_dispatch', 'assigned', 'created', 'Auto-dispatched to available technician');
  END IF;
  
  RETURN _assigned_user_id;
END;
$$;

-- Soft-lock release function
CREATE OR REPLACE FUNCTION public.release_soft_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE bookings
  SET status = 'cancelled', 
      cancellation_reason = 'Soft lock expired (10 min timeout)',
      updated_at = now()
  WHERE is_soft_lock = true
    AND soft_lock_expires_at < now()
    AND status = 'pending';
END;
$$;

-- Property safety auto-pause trigger function
CREATE OR REPLACE FUNCTION public.auto_pause_property_on_safety_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_active = true AND NEW.listing_paused = true THEN
    UPDATE properties SET is_paused = true WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_pause_on_safety_flag
  AFTER INSERT ON property_safety_flags
  FOR EACH ROW
  EXECUTE FUNCTION auto_pause_property_on_safety_flag();

-- Compensation calculator function
CREATE OR REPLACE FUNCTION public.calculate_compensation(
  _booking_id uuid,
  _severity text DEFAULT 'minor'
)
RETURNS TABLE(refund_amount numeric, nightly_rate numeric, impacted_nights integer, severity_multiplier numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking RECORD;
  _mult numeric;
  _nights int;
  _rate numeric;
BEGIN
  SELECT * INTO _booking FROM bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  
  _nights := GREATEST(1, _booking.check_out - _booking.check_in);
  _rate := _booking.total_price / _nights;
  
  _mult := CASE _severity
    WHEN 'minor' THEN 0.25
    WHEN 'major' THEN 0.50
    WHEN 'uninhabitable' THEN 1.0
    ELSE 0.25
  END;
  
  RETURN QUERY SELECT 
    (_rate * _nights * _mult)::numeric,
    _rate::numeric,
    _nights,
    _mult;
END;
$$;

-- Vendor role: allow vendors to view/update work orders assigned to them
CREATE POLICY "Vendors can view assigned work orders"
  ON work_orders FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'vendor') AND vendor_id = auth.uid());

CREATE POLICY "Vendors can update assigned work orders"
  ON work_orders FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'vendor') AND vendor_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'vendor') AND vendor_id = auth.uid());

-- Allow landlords to insert properties
CREATE POLICY "Landlords can insert properties"
  ON properties FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'landlord') OR has_role(auth.uid(), 'admin'));
