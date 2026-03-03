-- Fix overly permissive INSERT policy
DROP POLICY "Authenticated users can create notifications" ON public.landlord_notifications;

CREATE POLICY "Tenants can create notifications for landlords"
ON public.landlord_notifications FOR INSERT TO authenticated
WITH CHECK (tenant_user_id = auth.uid());