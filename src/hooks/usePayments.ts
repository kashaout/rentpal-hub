import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";

export interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  payment_date: string;
  due_date: string | null;
  status: "completed" | "pending" | "failed" | "refunded";
  payment_method: "cash" | "bank_transfer" | "check" | "card" | "other" | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithTenant extends Payment {
  tenant_name: string;
  property_name: string;
  unit_number: string;
}

export function usePayments(tenantId?: string) {
  return useQuery({
    queryKey: ["payments", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select(`
          *,
          tenants!inner (
            unit_number,
            properties!inner (name),
            profiles (full_name)
          )
        `)
        .order("payment_date", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((p: any) => ({
        ...p,
        tenant_name: p.tenants?.profiles?.full_name || "Unknown",
        property_name: p.tenants?.properties?.name || "Unknown",
        unit_number: p.tenants?.unit_number || "",
      })) as PaymentWithTenant[];
    },
  });
}

export function usePaymentsByTenant(tenantId: string) {
  return useQuery({
    queryKey: ["payments", "tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!tenantId,
  });
}

interface CreatePaymentInput {
  tenant_id: string;
  amount: number;
  payment_date: string;
  due_date?: string;
  status?: "completed" | "pending" | "failed" | "refunded";
  payment_method?: "cash" | "bank_transfer" | "check" | "card" | "other";
  notes?: string;
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const { data, error } = await supabase
        .from("payments")
        .insert({
          tenant_id: input.tenant_id,
          amount: input.amount,
          payment_date: input.payment_date,
          due_date: input.due_date || null,
          status: input.status || "completed",
          payment_method: input.payment_method || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: "Payment recorded",
        description: "The payment has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

interface UpdatePaymentInput {
  id: string;
  amount?: number;
  payment_date?: string;
  due_date?: string | null;
  status?: "completed" | "pending" | "failed" | "refunded";
  payment_method?: "cash" | "bank_transfer" | "check" | "card" | "other" | null;
  notes?: string | null;
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePaymentInput) => {
      const { data, error } = await supabase
        .from("payments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: "Payment updated",
        description: "The payment has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: "Payment deleted",
        description: "The payment has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
