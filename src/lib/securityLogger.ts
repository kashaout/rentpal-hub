import { supabase } from "@/integrations/supabase/client";

/**
 * Logs security events (RLS denials, role escalation attempts) to the
 * security_events table via the log_security_event RPC.
 * 
 * Non-blocking — errors are silently caught so they don't break the caller.
 */
export async function logSecurityEvent(
  tableName: string,
  action: string,
  eventType: "rls_denial" | "role_escalation" | "unauthorized_access" = "rls_denial",
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc("log_security_event", {
      _user_id: user.id,
      _table_name: tableName,
      _action: action,
      _event_type: eventType,
      _details: details as unknown as Record<string, string>,
    });
  } catch {
    // Silent — security logging must never block the main flow
  }
}

/**
 * Intercepts a Supabase error and logs it as an RLS denial if the message
 * contains "row-level security". Returns true if it was an RLS error.
 */
export function handleRlsError(error: unknown, tableName: string, action: string): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.toLowerCase().includes("row-level security")) {
    logSecurityEvent(tableName, action, "rls_denial", { error_message: msg });
    return true;
  }
  return false;
}
