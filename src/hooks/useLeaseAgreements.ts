import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  assertUuidFks,
  assertAuthUser,
  MutationSafetyError,
} from "@/lib/mutationSafety";
import { assertIdentityComplete } from "@/lib/identityGuard";

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
        .from("lease_agreements")
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
      let query = supabase
        .from("lease_agreements")
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
      // 1) Mutation safety layer — validate all FKs before hitting Supabase
      assertUuidFks(data as unknown as Record<string, unknown>, [
        { key: "property_id", label: "Property" },
        { key: "tenant_user_id", label: "Tenant" },
        { key: "landlord_user_id", label: "Property owner (landlord)" },
      ]);

      // 2) Verify auth session matches the tenant user on the lease
      const { data: sessionData } = await supabase.auth.getUser();
      assertAuthUser(sessionData?.user?.id, data.tenant_user_id);

      // 2b) Identity verification is mandatory before any lease can exist
      await assertIdentityComplete(sessionData?.user?.id);

      // 3) Verify property exists and landlord matches — use the same
      // SECURITY DEFINER RPC that tenants use to browse listings, so this
      // check works under tenant RLS (direct reads on `properties` are blocked).
      const { data: rpcRows, error: propErr } = await supabase.rpc(
        "get_public_property_listings",
        { _property_id: data.property_id }
      );

      if (propErr) {
        console.error("[lease] Property lookup failed:", propErr);
        throw new MutationSafetyError("Could not verify the selected property.");
      }
      const prop = (rpcRows ?? [])[0];
      if (!prop) {
        throw new MutationSafetyError("Selected property no longer exists.");
      }
      if (!prop.landlord_id) {
        throw new MutationSafetyError(
          "This property is missing a landlord owner. Please contact support."
        );
      }
      if (prop.landlord_id !== data.landlord_user_id) {
        throw new MutationSafetyError(
          "Landlord on this lease does not match the property owner."
        );
      }

      const { data: result, error } = await supabase
        .from("lease_agreements")
        .insert(data)
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
        });
        if (error) throw error;
      } else {
        // Landlord countersign — timestamp is the only source of truth.
        // Landlord can sign whenever landlord_signed_at IS NULL, regardless of
        // tenant signing order. Lease becomes "active" only when BOTH
        // tenant_signed_at AND landlord_signed_at are populated.
        const { data: current, error: fetchError } = await supabase
          .from("lease_agreements")
          .select("tenant_signed_at, landlord_signed_at")
          .eq("id", agreementId)
          .single();

        if (fetchError) throw fetchError;
        const currentData = current;

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
          .from("lease_agreements")
          .update(updateData)
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
