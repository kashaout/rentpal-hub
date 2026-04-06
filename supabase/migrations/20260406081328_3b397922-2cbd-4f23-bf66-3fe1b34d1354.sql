ALTER TABLE public.documents
ADD COLUMN tenant_id UUID REFERENCES tenants(id),
ADD COLUMN lease_id UUID REFERENCES lease_agreements(id),
ADD COLUMN maintenance_request_id UUID REFERENCES maintenance_requests(id);