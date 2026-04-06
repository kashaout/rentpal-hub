
-- Add notes column to properties and tenants for inline notes
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS notes text;

-- Add is_archived for soft delete
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
