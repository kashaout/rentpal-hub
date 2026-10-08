CREATE TABLE IF NOT EXISTS public.internal_job_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_job_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.internal_job_secrets TO service_role;
ALTER TABLE public.internal_job_secrets ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.internal_job_secrets IS 'Internal: shared secret used by scheduled jobs to call backend functions. No client access.';

INSERT INTO public.internal_job_secrets(name, secret)
VALUES ('cron_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.verify_cron_secret(_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _secret IS NOT NULL AND length(_secret) >= 32 AND EXISTS (
    SELECT 1 FROM public.internal_job_secrets
    WHERE name = 'cron_secret' AND secret = _secret
  );
$$;
REVOKE ALL ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;