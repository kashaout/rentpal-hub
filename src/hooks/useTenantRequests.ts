import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TenantRequest {
  id: string;
  tenant_user_id: string;
  property_id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  landlord_response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMyTenantRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenant-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_requests")
        .select("*")
        .eq("tenant_user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as TenantRequest[];
    },
    enabled: !!user?.id,
  });
}

export function useLandlordTenantRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["landlord-tenant-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as TenantRequest[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTenantRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { tenant_user_id: string; property_id: string; category: string; subject: string; message: string; priority?: string }) => {
      const { data: result, error } = await supabase
        .from("tenant_requests")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result as unknown as TenantRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-requests"] });
      queryClient.invalidateQueries({ queryKey: ["landlord-tenant-requests"] });
      toast.success("Request submitted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit request: ${error.message}`);
    },
  });
}

export function useRespondToRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, response, status }: { requestId: string; response: string; status?: string }) => {
      const { error } = await supabase
        .from("tenant_requests")
        .update({
          landlord_response: response,
          responded_at: new Date().toISOString(),
          status: status || "responded",
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-requests"] });
      queryClient.invalidateQueries({ queryKey: ["landlord-tenant-requests"] });
      toast.success("Response sent");
    },
    onError: (error: Error) => {
      toast.error(`Failed to respond: ${error.message}`);
    },
  });
}
