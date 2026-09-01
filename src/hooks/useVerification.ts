import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type VerificationType = "landlord" | "tenant_short_term" | "tenant_long_term";
export type VerificationStatus = "pending" | "approved" | "rejected" | "additional_info_needed";

export interface VerificationRequest {
  id: string;
  user_id: string;
  verification_type: VerificationType;
  status: VerificationStatus;
  submitted_data: Record<string, any>;
  document_paths: string[];
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useVerificationStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["verification-status", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as VerificationRequest[];
    },
    enabled: !!user,
  });
}

export function useLatestVerification(type?: VerificationType) {
  const { data: requests } = useVerificationStatus();

  if (!requests?.length) return null;

  if (type) {
    return requests.find((r) => r.verification_type === type) || null;
  }

  return requests[0];
}

export function useSubmitVerification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      verificationType,
      submittedData,
      documentPaths,
    }: {
      verificationType: VerificationType;
      submittedData: Record<string, any>;
      documentPaths: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user.id,
          verification_type: verificationType,
          submitted_data: submittedData,
          document_paths: documentPaths,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-status"] });
    },
  });
}

export function useUploadVerificationDoc() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("verification-documents")
        .upload(path, file);

      if (error) throw error;
      return path;
    },
  });
}

// Admin hooks
export function useAllVerificationRequests() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ["admin-verification-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as VerificationRequest[];
    },
    enabled: isAdmin,
  });
}

export function useApproveVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      approved,
      notes,
    }: {
      requestId: string;
      approved: boolean;
      notes?: string;
    }) => {
      const { error } = await supabase.rpc("approve_verification", {
        _request_id: requestId,
        _approved: approved,
        _notes: notes || undefined,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-verification-requests"] });
    },
  });
}

// Permission views hooks - the ONLY source for determining verified status
export function useIsVerifiedLandlord() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["verified-landlord", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("verified_landlords")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!user,
  });
}

export function useIsVerifiedTenant() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["verified-tenant", user?.id],
    queryFn: async () => {
      if (!user) return { shortTerm: false, longTerm: false, any: false };

      const [shortRes, longRes] = await Promise.all([
        supabase.from("verified_tenants_short_term").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("verified_tenants_long_term").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);

      const shortTerm = !!shortRes.data;
      const longTerm = !!longRes.data;
      return { shortTerm, longTerm, any: shortTerm || longTerm };
    },
    enabled: !!user,
  });
}
