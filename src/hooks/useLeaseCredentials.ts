import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeaseCredentials {
  wifi_password: string | null;
  keybox_password: string | null;
}

/**
 * Securely fetch WiFi + door (keybox) codes for a lease.
 * The DB function `get_lease_credentials` enforces:
 *   - tenant or landlord must be the caller
 *   - both parties must have signed
 *   - credentials_sent_at must be set
 *   - lease must still be within its window
 *
 * Returns null when the RPC denies access (e.g. lease not yet fully signed).
 */
export function useLeaseCredentials(leaseId?: string) {
  return useQuery({
    queryKey: ["lease-credentials", leaseId],
    queryFn: async (): Promise<LeaseCredentials | null> => {
      if (!leaseId) return null;
      const { data, error } = await supabase.rpc("get_lease_credentials", {
        _lease_id: leaseId,
      });
      if (error) {
        console.warn("[useLeaseCredentials] RPC denied/error:", error.message);
        return null;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        wifi_password: (row as any).wifi_password ?? null,
        keybox_password: (row as any).keybox_password ?? null,
      };
    },
    enabled: !!leaseId,
    staleTime: 60_000,
  });
}
