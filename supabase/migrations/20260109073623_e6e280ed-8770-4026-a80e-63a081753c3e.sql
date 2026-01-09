-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'consultant', 'landlord', 'tenant');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  monthly_rent DECIMAL(10, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  landlord_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create consultant property assignments table
CREATE TABLE public.consultant_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (consultant_id, property_id)
);

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  lease_start DATE NOT NULL,
  lease_end DATE NOT NULL,
  rent_amount DECIMAL(10, 2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get all roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(role)
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Function to check if user is consultant for a property
CREATE OR REPLACE FUNCTION public.is_consultant_for_property(_user_id UUID, _property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.consultant_assignments
    WHERE consultant_id = _user_id
      AND property_id = _property_id
  )
$$;

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Consultants can view profiles of assigned properties"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'consultant')
  AND EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.consultant_assignments ca ON ca.property_id = t.property_id
    WHERE t.user_id = profiles.user_id AND ca.consultant_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User Roles RLS Policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Properties RLS Policies
CREATE POLICY "Admins can manage all properties"
ON public.properties FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Landlords can view their own properties"
ON public.properties FOR SELECT
TO authenticated
USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can update their own properties"
ON public.properties FOR UPDATE
TO authenticated
USING (landlord_id = auth.uid())
WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Consultants can view assigned properties"
ON public.properties FOR SELECT
TO authenticated
USING (public.is_consultant_for_property(auth.uid(), id));

CREATE POLICY "Consultants can update assigned properties"
ON public.properties FOR UPDATE
TO authenticated
USING (public.is_consultant_for_property(auth.uid(), id))
WITH CHECK (public.is_consultant_for_property(auth.uid(), id));

CREATE POLICY "Tenants can view their property"
ON public.properties FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenants
    WHERE property_id = properties.id AND user_id = auth.uid()
  )
);

-- Consultant Assignments RLS Policies
CREATE POLICY "Admins can manage consultant assignments"
ON public.consultant_assignments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Consultants can view their assignments"
ON public.consultant_assignments FOR SELECT
TO authenticated
USING (consultant_id = auth.uid());

-- Tenants RLS Policies
CREATE POLICY "Admins can manage all tenants"
ON public.tenants FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Landlords can manage tenants in their properties"
ON public.tenants FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = tenants.property_id AND landlord_id = auth.uid()
  )
);

CREATE POLICY "Consultants can manage tenants in assigned properties"
ON public.tenants FOR ALL
TO authenticated
USING (public.is_consultant_for_property(auth.uid(), property_id));

CREATE POLICY "Tenants can view their own record"
ON public.tenants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();