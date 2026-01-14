const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type SecurityEventType = 
  | "admin_role_assigned" 
  | "admin_role_removed" 
  | "payment_modified" 
  | "bulk_payment_change";

export interface SecurityAlertPayload {
  event_type: SecurityEventType;
  affected_user_id?: string;
  affected_user_email?: string;
  actor_user_id: string;
  details?: Record<string, unknown>;
}

export async function sendSecurityAlert(payload: SecurityAlertPayload): Promise<void> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-security-alert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to send security alert:", error);
    }
  } catch (error) {
    // Don't throw - security alerts should not block the main operation
    console.error("Error sending security alert:", error);
  }
}
