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
  // wifi_password and keybox_password are NOT accessible via direct SELECT
  // Use get_lease_credentials RPC to retrieve them securely
  credentials_sent_at: string | null;
  check_in_time: string | null;
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useCreateLeaseAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<LeaseAgreement, "id" | "created_at" | "updated_at" | "tenant_signed" | "landlord_signed" | "tenant_signed_at" | "landlord_signed_at" | "document_id" | "status" | "credentials_sent_at" | "check_in_time">) => {
      // Defensive UUID validation — never let "" reach Postgres
      if (!data.property_id || !UUID_RE.test(data.property_id)) {
        console.error("[lease] Invalid property_id passed to createLeaseAgreement:", data.property_id);
        throw new Error("Invalid property selected");
      }
      if (!data.tenant_user_id || !UUID_RE.test(data.tenant_user_id)) {
        console.error("[lease] Invalid tenant_user_id:", data.tenant_user_id);
        throw new Error("Invalid tenant user");
      }
      if (!data.landlord_user_id || !UUID_RE.test(data.landlord_user_id)) {
        console.error("[lease] Invalid landlord_user_id:", data.landlord_user_id);
        throw new Error("This property is missing a landlord owner. Please contact support.");
      }

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
      if (role === "tenant") {
        // Use secure RPC that only updates signing fields
        const { error } = await supabase.rpc("sign_lease_as_tenant", {
          _lease_id: agreementId,
        } as any);
        if (error) throw error;
      } else {
        // Landlord countersign — timestamp is the only source of truth.
        // Landlord can sign whenever landlord_signed_at IS NULL, regardless of
        // tenant signing order. Lease becomes "active" only when BOTH
        // tenant_signed_at AND landlord_signed_at are populated.
        const { data: current, error: fetchError } = await supabase
          .from("lease_agreements" as any)
          .select("tenant_signed_at, landlord_signed_at")
          .eq("id", agreementId)
          .single();

        if (fetchError) throw fetchError;
        const currentData = current as any;

        // Only block if the LANDLORD has already signed.
        // Do NOT block when tenant_signed_at is set — that's the normal flow.
        if (currentData?.landlord_signed_at) {
          throw new Error("You have already signed this lease");
        }

        const nowIso = new Date().toISOString();
        const updateData: any = {
          landlord_signed: true,
          landlord_signed_at: nowIso,
          // Active only when both timestamps exist
          status: currentData?.tenant_signed_at ? "active" : "pending_signature",
        };

        const { error } = await supabase
          .from("lease_agreements" as any)
          .update(updateData as any)
          .eq("id", agreementId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lease-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["lease-agreement"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Agreement signed successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to sign: ${error.message}`);
    },
  });
}
