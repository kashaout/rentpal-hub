
-- 1) Fix maintenance_logs INSERT - remove standalone user_id branch
DROP POLICY IF EXISTS "Authenticated can insert maintenance logs" ON public.maintenance_logs;

CREATE POLICY "Authorized users can insert maintenance logs"
ON public.maintenance_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = maintenance_logs.work_order_id
      AND (
        is_landlord_of_property(auth.uid(), wo.property_id)
        OR is_tenant_of_property(auth.uid(), wo.property_id)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR (has_role(auth.uid(), 'maintenance'::app_role) AND wo.assigned_to = auth.uid())
        OR (has_role(auth.uid(), 'vendor'::app_role) AND wo.vendor_id = auth.uid())
      )
  )
  AND (user_id = auth.uid() OR user_id IS NULL)
);
