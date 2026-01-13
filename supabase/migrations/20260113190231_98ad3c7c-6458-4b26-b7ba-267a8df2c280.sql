-- Block anonymous (unauthenticated) access to all sensitive tables
-- The existing policies all require auth.uid() but don't explicitly block anonymous users

-- 1. profiles table - block anonymous SELECT
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- 2. payments table - block anonymous access
CREATE POLICY "Block anonymous access to payments"
ON public.payments
FOR SELECT
TO anon
USING (false);

-- 3. tenants table - block anonymous access
CREATE POLICY "Block anonymous access to tenants"
ON public.tenants
FOR SELECT
TO anon
USING (false);

-- 4. properties table - block anonymous access
CREATE POLICY "Block anonymous access to properties"
ON public.properties
FOR SELECT
TO anon
USING (false);

-- 5. maintenance_requests table - block anonymous access
CREATE POLICY "Block anonymous access to maintenance_requests"
ON public.maintenance_requests
FOR SELECT
TO anon
USING (false);

-- 6. user_roles table - block anonymous access
CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
FOR SELECT
TO anon
USING (false);

-- 7. consultant_assignments table - block anonymous access (warn level but fixing anyway)
CREATE POLICY "Block anonymous access to consultant_assignments"
ON public.consultant_assignments
FOR SELECT
TO anon
USING (false);