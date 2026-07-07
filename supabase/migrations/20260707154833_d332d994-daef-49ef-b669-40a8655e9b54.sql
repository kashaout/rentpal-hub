
-- =============================================================
-- Admin monitoring RPCs (read-only, admin-gated)
-- =============================================================

-- 1) Health snapshot
CREATE OR REPLACE FUNCTION public.rpc_admin_health_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_leases int;
  v_awaiting_signature int;
  v_payments_pending int;
  v_payments_completed int;
  v_payments_failed int;
  v_open_maintenance int;
  v_total_properties int;
  v_occupied_properties int;
  v_occupancy numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_active_leases
    FROM lease_agreements
    WHERE status = 'active'
      AND tenant_signed = true AND landlord_signed = true
      AND lease_end >= CURRENT_DATE;

  SELECT count(*) INTO v_awaiting_signature
    FROM lease_agreements
    WHERE status IN ('pending_signature', 'draft')
      AND (tenant_signed = false OR landlord_signed = false);

  SELECT count(*) INTO v_payments_pending
    FROM payments WHERE status = 'pending';

  SELECT count(*) INTO v_payments_completed
    FROM payments WHERE status = 'completed';

  SELECT count(*) INTO v_payments_failed
    FROM payments WHERE status IN ('failed','cancelled','refunded');

  SELECT count(*) INTO v_open_maintenance
    FROM maintenance_requests
    WHERE status NOT IN ('completed','verified','closed','cancelled');

  SELECT count(*) INTO v_total_properties
    FROM properties WHERE is_archived = false;

  SELECT count(DISTINCT property_id) INTO v_occupied_properties
    FROM tenants WHERE is_archived = false;

  v_occupancy := CASE WHEN v_total_properties > 0
    THEN ROUND((v_occupied_properties::numeric / v_total_properties) * 100, 1)
    ELSE 0 END;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'active_leases', v_active_leases,
    'leases_awaiting_signature', v_awaiting_signature,
    'payments_pending', v_payments_pending,
    'payments_completed', v_payments_completed,
    'payments_failed', v_payments_failed,
    'open_maintenance_requests', v_open_maintenance,
    'total_properties', v_total_properties,
    'occupied_properties', v_occupied_properties,
    'occupancy_percent', v_occupancy
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_admin_health_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_admin_health_snapshot() TO authenticated;


-- 2) Operational metrics over a rolling window (default 30 days)
CREATE OR REPLACE FUNCTION public.rpc_admin_operational_metrics(_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz;
  v_registrations int;
  v_active_landlords int;
  v_active_tenants int;
  v_active_consultants int;
  v_active_maintenance int;
  v_leases_created int;
  v_leases_signed int;
  v_payments_completed int;
  v_maintenance_created int;
  v_maintenance_resolved int;
  v_total_properties int;
  v_occupied_properties int;
  v_occupancy numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  _days := GREATEST(1, LEAST(365, COALESCE(_days, 30)));
  v_since := now() - make_interval(days => _days);

  SELECT count(*) INTO v_registrations
    FROM profiles WHERE created_at >= v_since;

  SELECT count(DISTINCT ur.user_id) INTO v_active_landlords
    FROM user_roles ur WHERE ur.role = 'landlord';

  SELECT count(DISTINCT ur.user_id) INTO v_active_tenants
    FROM user_roles ur WHERE ur.role = 'tenant';

  SELECT count(DISTINCT ur.user_id) INTO v_active_consultants
    FROM user_roles ur WHERE ur.role = 'consultant';

  SELECT count(DISTINCT ur.user_id) INTO v_active_maintenance
    FROM user_roles ur WHERE ur.role IN ('maintenance','vendor');

  SELECT count(*) INTO v_leases_created
    FROM lease_agreements WHERE created_at >= v_since;

  SELECT count(*) INTO v_leases_signed
    FROM lease_agreements
    WHERE tenant_signed = true AND landlord_signed = true
      AND updated_at >= v_since;

  SELECT count(*) INTO v_payments_completed
    FROM payments WHERE status = 'completed' AND updated_at >= v_since;

  SELECT count(*) INTO v_maintenance_created
    FROM maintenance_requests WHERE created_at >= v_since;

  SELECT count(*) INTO v_maintenance_resolved
    FROM maintenance_requests
    WHERE resolved_at IS NOT NULL AND resolved_at >= v_since;

  SELECT count(*) INTO v_total_properties FROM properties WHERE is_archived = false;
  SELECT count(DISTINCT property_id) INTO v_occupied_properties FROM tenants WHERE is_archived = false;
  v_occupancy := CASE WHEN v_total_properties > 0
    THEN ROUND((v_occupied_properties::numeric / v_total_properties) * 100, 1)
    ELSE 0 END;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'window_days', _days,
    'registrations', v_registrations,
    'active_landlords', v_active_landlords,
    'active_tenants', v_active_tenants,
    'active_consultants', v_active_consultants,
    'active_maintenance_staff', v_active_maintenance,
    'leases_created', v_leases_created,
    'leases_signed', v_leases_signed,
    'payments_completed', v_payments_completed,
    'maintenance_requests_created', v_maintenance_created,
    'maintenance_requests_resolved', v_maintenance_resolved,
    'occupancy_percent', v_occupancy
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_admin_operational_metrics(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_admin_operational_metrics(int) TO authenticated;


-- 3) Integrity anomalies: catches lifecycle drift and stuck payments
CREATE OR REPLACE FUNCTION public.rpc_admin_integrity_anomalies()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missing_booking jsonb;
  v_missing_payment jsonb;
  v_missing_credentials jsonb;
  v_payments_stuck jsonb;
  v_failed_payments_24h int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Active fully-signed leases with no booking row for this tenant+property+dates
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'lease_id', la.id,
    'property_id', la.property_id,
    'tenant_user_id', la.tenant_user_id
  )), '[]'::jsonb)
  INTO v_missing_booking
  FROM lease_agreements la
  WHERE la.status = 'active'
    AND la.tenant_signed = true AND la.landlord_signed = true
    AND la.lease_end >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.property_id = la.property_id
        AND b.user_id = la.tenant_user_id
        AND b.check_in = la.lease_start
        AND b.check_out = la.lease_end
    );

  -- Active fully-signed leases with no payment row
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'lease_id', la.id,
    'property_id', la.property_id
  )), '[]'::jsonb)
  INTO v_missing_payment
  FROM lease_agreements la
  WHERE la.status = 'active'
    AND la.tenant_signed = true AND la.landlord_signed = true
    AND la.lease_end >= CURRENT_DATE
    AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.lease_id = la.id);

  -- Active fully-signed leases with no credentials
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'lease_id', la.id,
    'property_id', la.property_id
  )), '[]'::jsonb)
  INTO v_missing_credentials
  FROM lease_agreements la
  WHERE la.status = 'active'
    AND la.tenant_signed = true AND la.landlord_signed = true
    AND la.lease_end >= CURRENT_DATE
    AND NOT EXISTS (SELECT 1 FROM lease_credentials lc WHERE lc.lease_id = la.id);

  -- Payments stuck pending > 24h
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'payment_id', p.id,
    'tenant_id', p.tenant_id,
    'lease_id', p.lease_id,
    'amount', p.amount,
    'created_at', p.created_at
  )), '[]'::jsonb)
  INTO v_payments_stuck
  FROM payments p
  WHERE p.status = 'pending'
    AND p.created_at < now() - interval '24 hours';

  SELECT count(*) INTO v_failed_payments_24h
    FROM payments
    WHERE status IN ('failed','cancelled')
      AND updated_at >= now() - interval '24 hours';

  RETURN jsonb_build_object(
    'generated_at', now(),
    'active_leases_missing_booking', v_missing_booking,
    'active_leases_missing_payment', v_missing_payment,
    'active_leases_missing_credentials', v_missing_credentials,
    'payments_pending_over_24h', v_payments_stuck,
    'failed_payments_last_24h', v_failed_payments_24h
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_admin_integrity_anomalies() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_admin_integrity_anomalies() TO authenticated;


-- 4) Recent security event summary (auth failures, storage denials, role escalations)
CREATE OR REPLACE FUNCTION public.rpc_admin_security_summary(_hours int DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz;
  v_by_type jsonb;
  v_total int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  _hours := GREATEST(1, LEAST(24 * 30, COALESCE(_hours, 24)));
  v_since := now() - make_interval(hours => _hours);

  SELECT COALESCE(jsonb_object_agg(event_type, cnt), '{}'::jsonb), COALESCE(sum(cnt), 0)
  INTO v_by_type, v_total
  FROM (
    SELECT event_type, count(*) AS cnt
    FROM security_events
    WHERE created_at >= v_since
    GROUP BY event_type
  ) s;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'window_hours', _hours,
    'total_events', v_total,
    'by_type', v_by_type
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_admin_security_summary(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_admin_security_summary(int) TO authenticated;
