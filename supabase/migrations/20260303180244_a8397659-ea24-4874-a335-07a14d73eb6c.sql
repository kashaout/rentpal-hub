-- Create tenant-verification storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-verification', 'tenant-verification', false);

-- RLS: Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own verification files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tenant-verification' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Allow users to view their own files
CREATE POLICY "Users can view their own verification files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tenant-verification' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Allow landlords to view tenant verification files for their properties
CREATE POLICY "Landlords can view tenant verification files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tenant-verification' AND has_role(auth.uid(), 'landlord'::app_role));

-- RLS: Allow admins full access
CREATE POLICY "Admins can manage all verification files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'tenant-verification' AND has_role(auth.uid(), 'admin'::app_role));

-- Create a table for landlord notifications
CREATE TABLE IF NOT EXISTS public.landlord_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_user_id uuid NOT NULL,
  tenant_user_id uuid NOT NULL,
  lease_agreement_id uuid REFERENCES public.lease_agreements(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'lease_signing',
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landlord_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their notifications"
ON public.landlord_notifications FOR SELECT TO authenticated
USING (landlord_user_id = auth.uid());

CREATE POLICY "Landlords can update their notifications"
ON public.landlord_notifications FOR UPDATE TO authenticated
USING (landlord_user_id = auth.uid())
WITH CHECK (landlord_user_id = auth.uid());

CREATE POLICY "Authenticated users can create notifications"
ON public.landlord_notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications"
ON public.landlord_notifications FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block anonymous access to landlord_notifications"
ON public.landlord_notifications FOR SELECT TO anon
USING (false);