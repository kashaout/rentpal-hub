import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";

export interface CheckoutResult {
  lease_id: string;
  property_id: string;
  checked_out_at: string;
  tenancies_closed: number;
  bookings_completed: number;
  property_released: boolean;
  already_checked_out?: boolean;
}

/**
 * ATOMIC TENANT CHECKOUT
 * ----------------------
 * Single server-side transaction (`rpc_complete_checkout`) that:
 *   1. ends the lease (status='ended') and stamps `checked_out_at`
 *   2. archives the tenants bridge row (removes active occupancy)
 *   3. completes the related booking (history preserved)
 *   4. releases the property (`is_paused=false`) when no active tenancy remains
 *
 * Authorization is enforced inside the RPC (tenant on the lease, the landlord,
 * an assigned consultant, or an admin). Nothing is deleted.
 */
export function useCompleteCheckout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      leaseId,
      checkoutAt,
    }: {
      leaseId: string;
      checkoutAt?: string;
    }): Promise<CheckoutResult> => {
      const { data, error } = await supabase.rpc("rpc_complete_checkout", {
        _lease_id: leaseId,
        _checkout_at: checkoutAt ?? new Date().toISOString(),
      });
      if (error) throw error;
      return data as unknown as CheckoutResult;
    },
    onSuccess: (result) => {
      // Invalidate every surface that can hold stale occupancy state.
      [
        "tenant-lifecycle",
        "landlord-lifecycle",
        "active-tenant",
        "tenant-bridge-id",
        "tenant-lease-by-property",
        "tenant-properties",
        "tenant-booked-properties",
        "tenant-paid-status",
        "properties",
        "property",
        "property-tenants",
        "public-property",
        "browse-properties",
        "bookings",
        "my-bookings",
        "property-bookings",
        "tenants",
        "lease-agreements",
        "payments",
        "dashboard-stats",
      ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));

      toast({
        title: "Checkout completed",
        description: result?.property_released
          ? "The tenancy has ended and the property is available again."
          : "The tenancy has ended. Another active tenancy still occupies this property.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout failed",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
