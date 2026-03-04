CREATE POLICY "Landlords can view tenant profiles in their properties"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    JOIN public.properties p ON p.id = t.property_id
    WHERE t.user_id = profiles.user_id
      AND p.landlord_id = auth.uid()
  )
);