
-- Lease Agreements table for contracts between tenant and landlord
CREATE TABLE public.lease_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_user_id uuid NOT NULL,
  landlord_user_id uuid NOT NULL,
  tenant_name text NOT NULL,
  landlord_name text NOT NULL,
  unit_number text NOT NULL,
  rent_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  lease_start date NOT NULL,
  lease_end date NOT NULL,
  terms text NOT NULL DEFAULT 'Standard lease agreement terms apply.',
  tenant_signed boolean NOT NULL DEFAULT false,
  landlord_signed boolean NOT NULL DEFAULT false,
  tenant_signed_at timestamptz,
  landlord_signed_at timestamptz,
  document_id uuid REFERENCES public.documents(id),
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_agreements ENABLE ROW LEVEL SECURITY;

-- RLS policies for lease_agreements
CREATE POLICY "Admins can manage all lease agreements" ON public.lease_agreements FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Landlords can manage their lease agreements" ON public.lease_agreements FOR ALL TO authenticated USING (landlord_user_id = auth.uid());
CREATE POLICY "Tenants can view and sign their lease agreements" ON public.lease_agreements FOR SELECT TO authenticated USING (tenant_user_id = auth.uid());
CREATE POLICY "Tenants can update their own agreements for signing" ON public.lease_agreements FOR UPDATE TO authenticated USING (tenant_user_id = auth.uid()) WITH CHECK (tenant_user_id = auth.uid());
CREATE POLICY "Block anonymous access to lease_agreements" ON public.lease_agreements FOR SELECT TO anon USING (false);

-- Tenant Requests table for general communication
CREATE TABLE public.tenant_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  landlord_response text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_requests
CREATE POLICY "Admins can manage all tenant requests" ON public.tenant_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Landlords can manage requests for their properties" ON public.tenant_requests FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM properties p WHERE p.id = tenant_requests.property_id AND p.landlord_id = auth.uid()));
CREATE POLICY "Consultants can manage requests for assigned properties" ON public.tenant_requests FOR ALL TO authenticated USING (is_consultant_for_property(auth.uid(), property_id));
CREATE POLICY "Tenants can view their own requests" ON public.tenant_requests FOR SELECT TO authenticated USING (tenant_user_id = auth.uid());
CREATE POLICY "Tenants can create requests" ON public.tenant_requests FOR INSERT TO authenticated WITH CHECK (tenant_user_id = auth.uid());
CREATE POLICY "Block anonymous access to tenant_requests" ON public.tenant_requests FOR SELECT TO anon USING (false);

-- Allow ALL authenticated users to browse properties (for tenant property browsing)
CREATE POLICY "Authenticated users can browse properties" ON public.properties FOR SELECT TO authenticated USING (true);
