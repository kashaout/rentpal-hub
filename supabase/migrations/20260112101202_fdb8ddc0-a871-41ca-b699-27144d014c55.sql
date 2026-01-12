-- Add server-side input validation constraints for security

-- Profiles table: email format and phone length
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_phone_length 
CHECK (phone IS NULL OR length(phone) <= 20);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_full_name_length 
CHECK (full_name IS NULL OR length(full_name) <= 100);

-- Maintenance requests: title and description length limits
ALTER TABLE public.maintenance_requests 
ADD CONSTRAINT maintenance_requests_title_length 
CHECK (length(title) <= 200);

ALTER TABLE public.maintenance_requests 
ADD CONSTRAINT maintenance_requests_description_length 
CHECK (length(description) <= 5000);

-- Properties: name and address length limits
ALTER TABLE public.properties 
ADD CONSTRAINT properties_name_length 
CHECK (length(name) <= 200);

ALTER TABLE public.properties 
ADD CONSTRAINT properties_address_length 
CHECK (length(address) <= 500);

-- Payments: notes length and positive amount
ALTER TABLE public.payments 
ADD CONSTRAINT payments_notes_length 
CHECK (notes IS NULL OR length(notes) <= 1000);

ALTER TABLE public.payments 
ADD CONSTRAINT payments_amount_positive 
CHECK (amount > 0);

-- Tenants: unit number and rent amount validation
ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_unit_number_length 
CHECK (length(unit_number) <= 50);

ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_rent_amount_positive 
CHECK (rent_amount > 0);