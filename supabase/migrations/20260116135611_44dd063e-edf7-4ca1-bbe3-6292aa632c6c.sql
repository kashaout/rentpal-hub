-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create documents table to track uploaded files
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents table
CREATE POLICY "Block anonymous access to documents" 
ON public.documents 
FOR SELECT 
USING (false);

CREATE POLICY "Admins can manage all documents" 
ON public.documents 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Landlords can manage documents in their properties" 
ON public.documents 
FOR ALL 
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = documents.property_id AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Consultants can manage documents in assigned properties" 
ON public.documents 
FOR ALL 
USING (
  is_consultant_for_property(auth.uid(), property_id) OR
  uploaded_by = auth.uid()
);

CREATE POLICY "Tenants can view documents for their property" 
ON public.documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.property_id = documents.property_id AND t.user_id = auth.uid()
  )
);

-- Storage policies for documents bucket
CREATE POLICY "Users can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view documents they have access to"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add trigger for updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();