
DROP POLICY "Authenticated can insert maintenance logs" ON public.maintenance_logs;
CREATE POLICY "Authenticated can insert maintenance logs" ON public.maintenance_logs FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = maintenance_logs.work_order_id AND (
    public.is_landlord_of_property(auth.uid(), wo.property_id) OR
    public.is_tenant_of_property(auth.uid(), wo.property_id) OR
    public.has_role(auth.uid(), 'maintenance') OR
    public.has_role(auth.uid(), 'admin') OR
    (public.has_role(auth.uid(), 'vendor') AND wo.vendor_id = auth.uid())
  ))
);
