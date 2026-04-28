-- Tighten properties INSERT policy: landlord must set landlord_id = auth.uid()
DROP POLICY IF EXISTS "Landlords can insert properties" ON public.properties;

CREATE POLICY "Landlords can insert properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'landlord'::app_role)
    AND landlord_id = auth.uid()
  )
);