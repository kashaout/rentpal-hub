
-- ============================================
-- 1) Add ux_role to profiles (UX-only, no privileges)
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ux_role text DEFAULT NULL;

-- ============================================
-- 2) Create verification_requests table
-- ============================================
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  verification_type text NOT NULL, -- 'landlord', 'tenant_short_term', 'tenant_long_term'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'additional_info_needed'
  submitted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_paths text[] DEFAULT '{}'::text[],
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own verification requests"
ON public.verification_requests
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create own verification requests"
ON public.verification_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can manage all verification requests"
ON public.verification_requests
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous
CREATE POLICY "Block anonymous access to verification_requests"
ON public.verification_requests
FOR SELECT TO anon
USING (false);

-- No user UPDATE/DELETE
CREATE POLICY "Block user updates on verification_requests"
ON public.verification_requests
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block user deletes on verification_requests"
ON public.verification_requests
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_verification_requests_updated_at
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3) Create verification-documents storage bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own folder
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own files
CREATE POLICY "Users can view own verification documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all verification documents
CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- 4) Create approve_verification RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.approve_verification(
  _request_id uuid,
  _approved boolean,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req RECORD;
  _role app_role;
BEGIN
  -- Admin only
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO _req FROM verification_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;

  IF _req.status != 'pending' AND _req.status != 'additional_info_needed' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;

  IF _approved THEN
    -- Determine role to assign
    IF _req.verification_type = 'landlord' THEN
      _role := 'landlord'::app_role;
    ELSIF _req.verification_type IN ('tenant_short_term', 'tenant_long_term') THEN
      _role := 'tenant'::app_role;
    ELSE
      RAISE EXCEPTION 'Unknown verification type';
    END IF;

    -- Assign role if not already present
    INSERT INTO user_roles (user_id, role)
    VALUES (_req.user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Update request
    UPDATE verification_requests
    SET status = 'approved',
        admin_notes = _notes,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
    WHERE id = _request_id;
  ELSE
    UPDATE verification_requests
    SET status = 'rejected',
        admin_notes = _notes,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
    WHERE id = _request_id;
  END IF;
END;
$$;

-- ============================================
-- 5) Fix subscription self-upgrade: remove ALL user UPDATE
-- ============================================
DROP POLICY IF EXISTS "Block non-admin subscription updates" ON public.subscriptions;
CREATE POLICY "Block all user subscription updates"
ON public.subscriptions
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
