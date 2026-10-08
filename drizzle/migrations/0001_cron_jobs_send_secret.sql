DO $$
DECLARE j record; newcmd text;
BEGIN
  FOR j IN SELECT jobid, command FROM cron.job WHERE jobname IN ('reconciliation-job-every-5-min','escalation-engine-every-15-min','daily-workflow-check','send-access-credentials-hourly') AND position('x-cron-secret' in command) = 0 LOOP
    newcmd := replace(j.command, 'headers:=''{"Content-Type": "application/json", ', 'headers:=(''{"Content-Type": "application/json", ');
    newcmd := regexp_replace(newcmd, '(Bearer [^"]*"\})''::jsonb', '\1''::jsonb || jsonb_build_object(''x-cron-secret'', (SELECT secret FROM public.internal_job_secrets WHERE name = ''cron_secret'')))');
    PERFORM cron.alter_job(j.jobid, command := newcmd);
  END LOOP;
END $$;