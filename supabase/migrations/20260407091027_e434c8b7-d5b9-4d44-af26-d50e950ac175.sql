
-- ============================================================
-- FIX 1: get_user_roles — restrict to self or admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow querying own roles or admin
  IF _user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: cannot query other users roles';
  END IF;

  RETURN (
    SELECT ARRAY_AGG(role)
    FROM public.user_roles
    WHERE user_id = _user_id
  );
END;
$$;

-- ============================================================
-- FIX 2: get_user_subscription — restrict to self or admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_subscription(_user_id uuid)
RETURNS TABLE(plan subscription_plan, property_limit integer, features jsonb, is_active boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow querying own subscription or admin
  IF _user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: cannot query other users subscriptions';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(s.plan, 'free'::subscription_plan),
    COALESCE(s.property_limit, 1),
    COALESCE(s.features, '{"compliance_tracker": false, "automation_workflows": false, "advanced_reports": false, "ai_insights": false, "multi_user": false, "maintenance": false, "financials": false, "reports": false, "consultants": false}'::jsonb),
    COALESCE(s.is_active, true)
  FROM public.subscriptions s
  WHERE s.user_id = _user_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      'free'::subscription_plan,
      1::integer,
      '{"compliance_tracker": false, "automation_workflows": false, "advanced_reports": false, "ai_insights": false, "multi_user": false, "maintenance": false, "financials": false, "reports": false, "consultants": false}'::jsonb,
      true::boolean;
  END IF;
END;
$$;

-- ============================================================
-- FIX 3: calculate_compensation — validate authorization
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_compensation(_booking_id uuid, _severity text DEFAULT 'minor'::text)
RETURNS TABLE(refund_amount numeric, nightly_rate numeric, impacted_nights integer, severity_multiplier numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking RECORD;
  _mult numeric;
  _nights int;
  _rate numeric;
BEGIN
  SELECT * INTO _booking FROM bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  
  -- Validate caller is authorized (booking owner, property landlord, or admin)
  IF _booking.user_id != auth.uid()
    AND NOT is_landlord_of_property(auth.uid(), _booking.property_id)
    AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: not a party to this booking';
  END IF;

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

-- ============================================================
-- FIX 4: auto_dispatch_work_order — validate authorization
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_dispatch_work_order(_work_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wo RECORD;
  _assigned_user_id uuid;
BEGIN
  SELECT * INTO _wo FROM work_orders WHERE id = _work_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Work order not found'; END IF;
  
  -- Only landlord of property or admin can trigger auto-dispatch
  IF NOT is_landlord_of_property(auth.uid(), _wo.property_id)
    AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: only property owner or admin can dispatch';
  END IF;

  SELECT ur.user_id INTO _assigned_user_id
  FROM user_roles ur
  JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('maintenance', 'vendor')
  ORDER BY
    (SELECT count(*) FROM work_orders wo2 
     WHERE wo2.assigned_to = ur.user_id 
     AND wo2.status NOT IN ('closed', 'verified', 'completed')) ASC,
    COALESCE(p.technician_performance_score, 50) DESC,
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

-- ============================================================
-- FIX 5: Scope maintenance work order access to assigned only
-- ============================================================
DROP POLICY IF EXISTS "Maintenance users can view work orders" ON public.work_orders;
CREATE POLICY "Maintenance users can view work orders"
ON public.work_orders FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'maintenance'::app_role)
  AND assigned_to = auth.uid()
);

DROP POLICY IF EXISTS "Maintenance users can update work orders" ON public.work_orders;
CREATE POLICY "Maintenance users can update work orders"
ON public.work_orders FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'maintenance'::app_role)
  AND assigned_to = auth.uid()
);

-- ============================================================
-- FIX 6: Maintenance requests — scope to assigned requests only
-- ============================================================
DROP POLICY IF EXISTS "Maintenance users can view all requests" ON public.maintenance_requests;
CREATE POLICY "Maintenance users can view assigned requests"
ON public.maintenance_requests FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'maintenance'::app_role)
  AND assigned_to = auth.uid()
);

DROP POLICY IF EXISTS "Maintenance users can update requests" ON public.maintenance_requests;
CREATE POLICY "Maintenance users can update assigned requests"
ON public.maintenance_requests FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'maintenance'::app_role)
  AND assigned_to = auth.uid()
);

-- ============================================================
-- FIX 7: Tighten bookings INSERT — validate property exists and is bookable
-- ============================================================
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = bookings.property_id 
    AND p.is_archived = false 
    AND (p.is_paused = false OR p.is_paused IS NULL)
  )
);

-- ============================================================
-- FIX 8: Prevent users from modifying their own booking status to 'confirmed'
-- ============================================================
CREATE OR REPLACE FUNCTION public.restrict_booking_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.property_id := OLD.property_id;
    NEW.user_id := OLD.user_id;
    NEW.total_price := OLD.total_price;
    -- Users can't self-confirm bookings
    IF OLD.user_id = auth.uid() AND NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
