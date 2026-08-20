import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface EscrowTransaction {
  id: string;
  booking_id: string | null;
  property_id: string;
  tenant_user_id: string;
  landlord_user_id: string;
  amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  reference_id: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
  processed_at: string | null;
  created_by: string | null;
  // Joined
  property_name?: string;
}

export function useEscrowTransactions(propertyId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["escrow-transactions", propertyId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("escrow_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EscrowTransaction[];
    },
    enabled: !!user,
  });
}

export function useCreateEscrowTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      booking_id?: string;
      property_id: string;
      tenant_user_id: string;
      landlord_user_id: string;
      amount: number;
      currency?: string;
      transaction_type: string;
      description?: string;
      stripe_payment_intent_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("escrow_transactions")
        .insert({
          ...input,
          status: "pending",
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as EscrowTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow-transactions"] });
      toast.success("Escrow transaction recorded");
    },
    onError: (error: Error) => {
      toast.error(`Escrow error: ${error.message}`);
    },
  });
}

export function useEscrowBalance(propertyId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["escrow-balance", propertyId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("escrow_transactions")
        .select("amount, transaction_type, status, currency")
        .eq("status", "completed");

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const transactions = (data || []) as unknown as EscrowTransaction[];
      let held = 0;
      let released = 0;
      let refunded = 0;

      transactions.forEach((t) => {
        if (t.transaction_type === "capture") held += Number(t.amount);
        if (t.transaction_type === "release") released += Number(t.amount);
        if (t.transaction_type === "refund") refunded += Number(t.amount);
      });

      return {
        held,
        released,
        refunded,
        balance: held - released - refunded,
        currency: transactions[0]?.currency || "NGN",
      };
    },
    enabled: !!user,
  });
}
