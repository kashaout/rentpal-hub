-- Allow any authenticated user to SELECT active, non-paused properties for browsing
-- Financial columns (acquisition_cost, current_value, annual_expenses) are visible 
-- but the public_property_listings view should be preferred in app code for tenant browsing
CREATE POLICY "Authenticated users can view active properties for browsing"
ON public.properties
FOR SELECT
TO authenticated
USING (
  is_archived = false 
  AND (is_paused = false OR is_paused IS NULL)
);