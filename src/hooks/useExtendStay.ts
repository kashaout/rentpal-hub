import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeErrorMessage } from "@/lib/errorUtils";

/** Stays end at 12:00 noon Lagos time (UTC+1, no DST) on the end date. Mirrors public.stay_end_at(). */
export function stayEndAt(endDate: string): Date {
  return new Date(`${endDate.slice(0, 10)}T12:00:00+01:00`);
}

export const EXTEND_WINDOW_HOURS = 6;

export function hoursUntilStayEnd(endDate: string, now: Date = new Date()): number {
  return (stayEndAt(endDate).getTime() - now.getTime()) / 3_600_000;
}

export function isInExtendWindow(endDate: string, now: Date = new Date()): boolean {
  const h = hoursUntilStayEnd(endDate, now);
  return h > 0 && h <= EXTEND_WINDOW_HOURS;
}

interface ExtendStayArgs {
  bookingId?: string;
  leaseId?: string;
  extraDays?: number;
}

export function useExtendStay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, leaseId, extraDays = 1 }: ExtendStayArgs) => {
      const { data, error } = await supabase.rpc("extend_stay", {
        _booking_id: bookingId,
        _lease_id: leaseId,
        _extra_days: extraDays,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["lease-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["landlord-lifecycle"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-lifecycle"] });
      toast.success("Your stay has been extended");
    },
    onError: (error: unknown) => {
      toast.error(sanitizeErrorMessage(error instanceof Error ? error : String((error as { message?: string })?.message ?? error)));
    },
  });
}
