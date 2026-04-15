-- Allow all authenticated users to browse available (non-archived, non-paused) properties
CREATE POLICY "Authenticated users can browse available properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  is_archived = false AND (is_paused = false OR is_paused IS NULL)
);

-- Allow landlords to also see bookings for their properties (needed for user visibility)
-- Landlords already have booking access via existing policies

-- Allow users who booked a property to see it
CREATE POLICY "Booking users can view booked properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.property_id = properties.id
      AND b.user_id = auth.uid()
      AND b.status IN ('confirmed', 'active', 'completed')
  )
);