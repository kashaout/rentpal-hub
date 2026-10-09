
- Scheduled jobs authenticate to backend functions with an `x-cron-secret` header read from `public.internal_job_secrets` (verified via `verify_cron_secret`, service-role only); the agent cannot write Vault, so this table holds the secret.
