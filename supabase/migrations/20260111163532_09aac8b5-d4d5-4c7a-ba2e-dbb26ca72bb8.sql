-- Create maintenance_requests table
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Admins can manage all maintenance requests
CREATE POLICY "Admins can manage all maintenance requests"
  ON public.maintenance_requests
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Consultants can manage requests for assigned properties
CREATE POLICY "Consultants can manage requests in assigned properties"
  ON public.maintenance_requests
  FOR ALL
  USING (is_consultant_for_property(auth.uid(), property_id));

-- Landlords can manage requests for their properties
CREATE POLICY "Landlords can manage requests in their properties"
  ON public.maintenance_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = maintenance_requests.property_id
      AND p.landlord_id = auth.uid()
    )
  );

-- Tenants can view and create their own requests
CREATE POLICY "Tenants can view their own requests"
  ON public.maintenance_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = maintenance_requests.tenant_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can create their own requests"
  ON public.maintenance_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = maintenance_requests.tenant_id
      AND t.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_maintenance_requests_tenant_id ON public.maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_requests_property_id ON public.maintenance_requests(property_id);
CREATE INDEX idx_maintenance_requests_status ON public.maintenance_requests(status);