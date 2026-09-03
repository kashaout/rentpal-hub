CREATE POLICY "Maintenance photo access by relationship"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'maintenance-photos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.maintenance_requests mr
      JOIN public.properties p ON p.id = mr.property_id
      WHERE objects.name = ANY (mr.photo_urls)
        AND (
          p.landlord_id = auth.uid()
          OR mr.assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenants t
            WHERE t.id = mr.tenant_id AND t.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.work_orders wo
            WHERE wo.maintenance_request_id = mr.id
              AND (wo.assigned_to = auth.uid() OR wo.vendor_id = auth.uid())
          )
          OR public.is_consultant_for_property(auth.uid(), mr.property_id)
        )
    )
  )
);