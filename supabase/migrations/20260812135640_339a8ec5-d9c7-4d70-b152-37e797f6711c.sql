CREATE OR REPLACE FUNCTION public.dispatch_new_maintenance_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _severity text;
  _sla record;
  _assignee uuid;
  _wo_id uuid;
  _landlord uuid;
  _prop_name text;
BEGIN
  _severity := CASE NEW.priority
    WHEN 'urgent' THEN 'emergency'
    WHEN 'high' THEN 'high'
    WHEN 'medium' THEN 'medium'
    ELSE 'low' END;

  SELECT response_minutes, resolution_minutes INTO _sla
  FROM sla_configs WHERE severity = _severity;

  -- pick least-loaded maintenance/vendor user
  SELECT ur.user_id INTO _assignee
  FROM user_roles ur
  LEFT JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('maintenance'::app_role, 'vendor'::app_role)
  ORDER BY
    (SELECT count(*) FROM work_orders wo2
      WHERE wo2.assigned_to = ur.user_id
        AND wo2.status NOT IN ('closed','verified','completed')) ASC,
    COALESCE(p.technician_performance_score, 50) DESC,
    random()
  LIMIT 1;

  INSERT INTO work_orders (
    maintenance_request_id, property_id, assigned_to, status, severity,
    sla_response_deadline, sla_resolution_deadline
  ) VALUES (
    NEW.id, NEW.property_id, _assignee,
    CASE WHEN _assignee IS NULL THEN 'created' ELSE 'assigned' END,
    _severity,
    now() + make_interval(mins => COALESCE(_sla.response_minutes, 720)),
    now() + make_interval(mins => COALESCE(_sla.resolution_minutes, 4320))
  )
  RETURNING id INTO _wo_id;

  INSERT INTO maintenance_logs (work_order_id, user_id, action, previous_status, new_status, details)
  VALUES (_wo_id, _assignee, CASE WHEN _assignee IS NULL THEN 'created' ELSE 'auto_dispatch' END,
          NULL, CASE WHEN _assignee IS NULL THEN 'created' ELSE 'assigned' END,
          CASE WHEN _assignee IS NULL THEN 'Work order created; no maintenance personnel available'
               ELSE 'Auto-dispatched to available maintenance personnel' END);

  IF _assignee IS NOT NULL THEN
    NEW.assigned_to := _assignee;
    NEW.status := CASE WHEN NEW.status = 'pending' THEN 'in_progress' ELSE NEW.status END;
  END IF;

  BEGIN
    SELECT landlord_id, name INTO _landlord, _prop_name FROM properties WHERE id = NEW.property_id;
    IF _landlord IS NOT NULL THEN
      INSERT INTO landlord_notifications (
        landlord_user_id, tenant_user_id, notification_type, title, message, property_id
      ) VALUES (
        _landlord, _landlord, 'maintenance_request',
        'New maintenance request: ' || COALESCE(_prop_name, 'Property'),
        NEW.title || ' (' || NEW.priority || ')' ||
          CASE WHEN _assignee IS NULL THEN ' — no personnel available, assign manually.' ELSE ' — auto-assigned to maintenance.' END,
        NEW.property_id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispatch_new_maintenance_request_trigger ON public.maintenance_requests;
CREATE TRIGGER dispatch_new_maintenance_request_trigger
BEFORE INSERT ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.dispatch_new_maintenance_request();

REVOKE EXECUTE ON FUNCTION public.dispatch_new_maintenance_request() FROM anon, authenticated;

-- Backfill: create work orders for existing requests that have none
DO $do$
DECLARE r record; _sev text; _sla record; _assignee uuid; _wo uuid;
BEGIN
  FOR r IN SELECT mr.* FROM maintenance_requests mr
           LEFT JOIN work_orders wo ON wo.maintenance_request_id = mr.id
           WHERE wo.id IS NULL AND mr.status NOT IN ('completed','cancelled')
  LOOP
    _sev := CASE r.priority WHEN 'urgent' THEN 'emergency' WHEN 'high' THEN 'high' WHEN 'medium' THEN 'medium' ELSE 'low' END;
    SELECT response_minutes, resolution_minutes INTO _sla FROM sla_configs WHERE severity = _sev;
    SELECT ur.user_id INTO _assignee FROM user_roles ur
      WHERE ur.role IN ('maintenance'::app_role,'vendor'::app_role) ORDER BY random() LIMIT 1;
    INSERT INTO work_orders (maintenance_request_id, property_id, assigned_to, status, severity, sla_response_deadline, sla_resolution_deadline)
    VALUES (r.id, r.property_id, _assignee, CASE WHEN _assignee IS NULL THEN 'created' ELSE 'assigned' END, _sev,
            now() + make_interval(mins => COALESCE(_sla.response_minutes,720)),
            now() + make_interval(mins => COALESCE(_sla.resolution_minutes,4320)))
    RETURNING id INTO _wo;
    INSERT INTO maintenance_logs (work_order_id, user_id, action, new_status, details)
      VALUES (_wo, _assignee, 'backfill_dispatch', CASE WHEN _assignee IS NULL THEN 'created' ELSE 'assigned' END, 'Backfilled work order for existing maintenance request');
    IF _assignee IS NOT NULL THEN
      UPDATE maintenance_requests SET assigned_to = _assignee,
        status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END
      WHERE id = r.id;
    END IF;
  END LOOP;
END
$do$;