import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Dispute {
  id: string;
  booking_id: string | null;
  property_id: string;
  filed_by: string;
  against_user: string;
  dispute_type: string;
  status: string;
  severity: string;
  description: string;
  evidence_urls: string[];
  resolution_type: string | null;
  resolution_amount: number;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  payout_frozen: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  property_name?: string;
  filer_name?: string;
}

export function useDisputes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["disputes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Dispute[];
    },
    enabled: !!user,
  });
}

export function useCreateDispute() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      booking_id?: string;
      property_id: string;
      against_user: string;
      dispute_type: string;
      severity: string;
      description: string;
      evidence_urls?: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Freeze payout on the booking if applicable
      if (input.booking_id) {
        await supabase
          .from("bookings")
          .update({ payout_status: "frozen" } as any)
          .eq("id", input.booking_id);
      }

      const { data, error } = await supabase
        .from("disputes")
        .insert({
          ...input,
          filed_by: user.id,
          payout_frozen: true,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Dispute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Dispute filed. Payout has been frozen pending review.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to file dispute: ${error.message}`);
    },
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      disputeId,
      resolution_type,
      resolution_amount,
      resolution_notes,
    }: {
      disputeId: string;
      resolution_type: string;
      resolution_amount: number;
      resolution_notes: string;
    }) => {
      const { error } = await supabase
        .from("disputes")
        .update({
          status: "resolved",
          resolution_type,
          resolution_amount,
          resolution_notes,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          payout_frozen: false,
        } as any)
        .eq("id", disputeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute resolved");
    },
    onError: (error: Error) => {
      toast.error(`Resolution failed: ${error.message}`);
    },
  });
}
