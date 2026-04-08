
DROP POLICY IF EXISTS "Maintenance users can view properties" ON public.properties;

CREATE POLICY "Maintenance users can view assigned properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'maintenance'::app_role)
  AND EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.property_id = properties.id
      AND wo.assigned_to = auth.uid()
  )
);
