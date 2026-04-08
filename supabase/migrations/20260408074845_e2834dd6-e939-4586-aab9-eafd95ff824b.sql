
DROP POLICY IF EXISTS "Block all user inserts to audit_logs" ON public.audit_logs;

CREATE POLICY "Block all user inserts to audit_logs"
ON public.audit_logs
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);
