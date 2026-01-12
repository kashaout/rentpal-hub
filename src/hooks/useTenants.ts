import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";

export interface Tenant {
  id: string;
  user_id: string | null;
  property_id: string;
  unit_number: string;
  lease_start: string;
  lease_end: string;
  rent_amount: number;
  payment_status: "paid" | "pending" | "overdue";
  created_at: string;
  updated_at: string;
}

export interface TenantWithDetails extends Tenant {
  property_name: string;
  profile?: {
    full_name: string | null;
    email: string;
    phone: string | null;
  };
}

export interface CreateTenantData {
  property_id: string;
  unit_number: string;
  lease_start: string;
  lease_end: string;
  rent_amount: number;
  user_id?: string;
  // For creating a new user/profile inline
  email?: string;
  full_name?: string;
  phone?: string;
}

export interface UpdateTenantData extends Partial<Omit<CreateTenantData, "property_id">> {
  id: string;
  payment_status?: "paid" | "pending" | "overdue";
}

export function useTenants(propertyId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenants", propertyId],
    queryFn: async () => {
      let query = supabase.from("tenants").select("*").order("created_at", { ascending: false });

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data: tenants, error } = await query;
      if (error) throw error;

      // Fetch property names and profiles
      const tenantsWithDetails: TenantWithDetails[] = await Promise.all(
        (tenants || []).map(async (tenant) => {
          // Get property name
          const { data: property } = await supabase
            .from("properties")
            .select("name")
            .eq("id", tenant.property_id)
            .maybeSingle();

          // Get profile if user_id exists
          let profile = undefined;
          if (tenant.user_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, email, phone")
              .eq("user_id", tenant.user_id)
              .maybeSingle();
            profile = profileData || undefined;
          }

          return {
            ...tenant,
            payment_status: tenant.payment_status as "paid" | "pending" | "overdue",
            property_name: property?.name || "Unknown Property",
            profile,
          };
        })
      );

      return tenantsWithDetails;
    },
    enabled: !!user,
  });
}

export function useTenant(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenant", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Tenant | null;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTenantData) => {
      const { email, full_name, phone, ...tenantData } = data;

      const { data: tenant, error } = await supabase
        .from("tenants")
        .insert(tenantData)
        .select()
        .single();

      if (error) throw error;
      return tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: "Tenant added successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add tenant",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTenantData) => {
      const { data: tenant, error } = await supabase
        .from("tenants")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return tenant;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenant", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: "Tenant updated successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update tenant",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: "Tenant removed successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove tenant",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "paid" | "pending" | "overdue" }) => {
      const { data: tenant, error } = await supabase
        .from("tenants")
        .update({ payment_status: status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast({ title: "Payment status updated!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update payment status",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
