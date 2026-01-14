-- Create audit_logs table to track sensitive operations
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  user_id uuid,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous access
CREATE POLICY "Block anonymous access to audit_logs"
ON public.audit_logs
FOR SELECT
TO anon
USING (false);

-- System can insert audit logs (via trigger with security definer)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Create audit logging function
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_cols text[];
  old_json jsonb;
  new_json jsonb;
BEGIN
  -- Determine changed fields for UPDATE
  IF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    SELECT array_agg(key) INTO changed_cols
    FROM jsonb_each(new_json) n
    WHERE n.value IS DISTINCT FROM (old_json -> n.key);
  END IF;

  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    changed_cols,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for user_roles table
CREATE TRIGGER audit_user_roles_insert
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_user_roles_update
AFTER UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_user_roles_delete
AFTER DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Create triggers for payments table
CREATE TRIGGER audit_payments_insert
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_payments_update
AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_payments_delete
AFTER DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();