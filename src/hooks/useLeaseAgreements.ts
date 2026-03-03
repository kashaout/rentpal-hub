import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface LeaseAgreement {
  id: string;
  property_id: string;
  tenant_user_id: string;
  landlord_user_id: string;
  tenant_name: string;
  landlord_name: string;
  unit_number: string;
  rent_amount: number;
  currency: string;
  lease_start: string;
  lease_end: string;
  terms: string;
  tenant_signed: boolean;
  landlord_signed: boolean;
  tenant_signed_at: string | null;
  landlord_signed_at: string | null;
  document_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useMyLeaseAgreements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lease-agreements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_agreements" as any)
        .select("*")
        .or(`tenant_user_id.eq.${user!.id},landlord_user_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as LeaseAgreement[];
    },
    enabled: !!user?.id,
  });
}

export function useLeaseAgreementByProperty(propertyId: string, tenantUserId?: string) {
  return useQuery({
    queryKey: ["lease-agreement", propertyId, tenantUserId],
    queryFn: async () => {
      let query = (supabase.from("lease_agreements" as any) as any)
        .select("*")
        .eq("property_id", propertyId);

      if (tenantUserId) {
        query = query.eq("tenant_user_id", tenantUserId);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (error) throw error;
      return data as unknown as LeaseAgreement | null;
    },
    enabled: !!propertyId,
  });
}

export function useCreateLeaseAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<LeaseAgreement, "id" | "created_at" | "updated_at" | "tenant_signed" | "landlord_signed" | "tenant_signed_at" | "landlord_signed_at" | "document_id" | "status">) => {
      const { data: result, error } = await supabase
        .from("lease_agreements" as any)
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return result as unknown as LeaseAgreement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lease-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["lease-agreement"] });
      toast.success("Lease agreement created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create agreement: ${error.message}`);
    },
  });
}

export function useSignLeaseAgreement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ agreementId, role }: { agreementId: string; role: "tenant" | "landlord" }) => {
      const updateData: any = {};
      if (role === "tenant") {
        updateData.tenant_signed = true;
        updateData.tenant_signed_at = new Date().toISOString();
      } else {
        updateData.landlord_signed = true;
        updateData.landlord_signed_at = new Date().toISOString();
      }

      // Check if both parties have now signed
      const { data: current } = await supabase
        .from("lease_agreements" as any)
        .select("tenant_signed, landlord_signed")
        .eq("id", agreementId)
        .single();

      const currentData = current as any;
      const bothSigned =
        (role === "tenant" && currentData?.landlord_signed) ||
        (role === "landlord" && currentData?.tenant_signed);

      if (bothSigned) {
        updateData.status = "active";
      } else {
        updateData.status = "pending_signature";
      }

      const { error } = await supabase
        .from("lease_agreements" as any)
        .update(updateData as any)
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lease-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["lease-agreement"] });
      toast.success("Agreement signed successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to sign: ${error.message}`);
    },
  });
}
