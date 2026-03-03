
-- Add listing_type to properties: 'standard' for annual rent, 'airbnb' for short-term
ALTER TABLE public.properties ADD COLUMN listing_type text NOT NULL DEFAULT 'standard';

-- Add tenant_type to tenants: 'long_stay' or 'short_stay' (only relevant for airbnb properties)
ALTER TABLE public.tenants ADD COLUMN tenant_type text NOT NULL DEFAULT 'long_stay';
