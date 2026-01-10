-- Create payments table for tracking rent payment history
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'card', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Admins can manage all payments
CREATE POLICY "Admins can manage all payments"
  ON public.payments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Consultants can manage payments for tenants in their assigned properties
CREATE POLICY "Consultants can manage payments in assigned properties"
  ON public.payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.consultant_assignments ca ON ca.property_id = t.property_id
      WHERE t.id = payments.tenant_id
      AND ca.consultant_id = auth.uid()
    )
  );

-- Landlords can manage payments for tenants in their properties
CREATE POLICY "Landlords can manage payments in their properties"
  ON public.payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.properties p ON p.id = t.property_id
      WHERE t.id = payments.tenant_id
      AND p.landlord_id = auth.uid()
    )
  );

-- Tenants can view their own payments
CREATE POLICY "Tenants can view their own payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = payments.tenant_id
      AND t.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date DESC);