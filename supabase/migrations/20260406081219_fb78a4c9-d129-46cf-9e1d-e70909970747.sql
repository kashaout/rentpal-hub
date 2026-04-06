ALTER TABLE public.payments
ADD COLUMN property_id UUID REFERENCES properties(id),
ADD COLUMN lease_id UUID REFERENCES lease_agreements(id);