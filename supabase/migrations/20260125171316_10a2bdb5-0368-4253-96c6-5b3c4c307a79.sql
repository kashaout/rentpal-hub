-- Create a security definer function to check if user is a tenant of a property
CREATE OR REPLACE FUNCTION public.is_tenant_of_property(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants
    WHERE user_id = _user_id
      AND property_id = _property_id
  )
$$;

-- Drop and recreate the problematic policy on properties
DROP POLICY IF EXISTS "Tenants can view their property" ON public.properties;

CREATE POLICY "Tenants can view their property"
ON public.properties
FOR SELECT
USING (is_tenant_of_property(auth.uid(), id));

-- Fix the tenants policy that references properties
DROP POLICY IF EXISTS "Landlords can manage tenants in their properties" ON public.tenants;

-- Create function to check if user is landlord of a property
CREATE OR REPLACE FUNCTION public.is_landlord_of_property(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = _property_id
      AND landlord_id = _user_id
  )
$$;

CREATE POLICY "Landlords can manage tenants in their properties"
ON public.tenants
FOR ALL
USING (is_landlord_of_property(auth.uid(), property_id));