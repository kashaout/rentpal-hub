-- Create active_tenants view as single source of truth for tenant access
CREATE OR REPLACE VIEW public.active_tenants
WITH (security_invoker = on) AS
SELECT 
  tenant_user_id,
  property_id,
  id AS lease_id,
  landlord_user_id,
  lease_start,
  lease_end,
  tenant_signed_at,
  landlord_signed_at
FROM public.lease_agreements
WHERE tenant_signed_at IS NOT NULL
  AND landlord_signed_at IS NOT NULL;

GRANT SELECT ON public.active_tenants TO authenticated;

-- Enable realtime on lease_agreements so tenant UI reacts when landlord countersigns
ALTER TABLE public.lease_agreements REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lease_agreements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lease_agreements;
  END IF;
END $$;