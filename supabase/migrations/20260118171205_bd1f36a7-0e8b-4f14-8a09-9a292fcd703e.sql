-- Allow maintenance users to view all maintenance requests
CREATE POLICY "Maintenance users can view all requests"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'maintenance'));

-- Allow maintenance users to update maintenance requests (status, notes, etc.)
CREATE POLICY "Maintenance users can update requests"
ON public.maintenance_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'maintenance'));

-- Allow maintenance users to view properties (needed for request context)
CREATE POLICY "Maintenance users can view properties"
ON public.properties
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'maintenance'));

-- Allow maintenance users to view tenant info (for contact purposes)
CREATE POLICY "Maintenance users can view tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'maintenance'));