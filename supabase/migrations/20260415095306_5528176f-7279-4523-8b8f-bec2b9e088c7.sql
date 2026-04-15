-- Remove the overly broad browse policy that exposes financial data
DROP POLICY IF EXISTS "Authenticated users can browse available properties" ON public.properties;

-- Remove redundant booking users policy (covered by existing tenant/landlord policies)
DROP POLICY IF EXISTS "Booking users can view booked properties" ON public.properties;