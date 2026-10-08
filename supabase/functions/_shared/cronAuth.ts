import { createClient } from "npm:@supabase/supabase-js@2.57.2";

/** Accepts the scheduled-job secret from the CRON_SECRET env var or the database-held job secret. */
export async function isAuthorizedCronCall(req: Request): Promise<boolean> {
  const incoming = req.headers.get("x-cron-secret");
  if (!incoming) return false;
  const envSecret = Deno.env.get("CRON_SECRET");
  if (envSecret && incoming === envSecret) return true;
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data, error } = await admin.rpc("verify_cron_secret", { _secret: incoming });
  return !error && data === true;
}
