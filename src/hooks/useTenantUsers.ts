import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TenantUser {
  user_id: string;
  email: string;
  full_name: string | null;
}

/**
 * Fetches users with the tenant role who are not yet assigned to any tenant record
 * This allows landlords/admins to link existing user accounts to tenant leases
 */
export function useAvailableTenantUsers() {
  const { user, isAdmin, isLandlord, isConsultant } = useAuth();

  return useQuery({
    queryKey: ["available-tenant-users"],
    queryFn: async () => {
      // Get users with tenant role
      const { data: tenantRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "tenant");

      if (rolesError) throw rolesError;

      const tenantUserIds = tenantRoles?.map((r) => r.user_id) || [];
      
      if (tenantUserIds.length === 0) {
        return [];
      }

      // Get users already assigned to tenant records
      const { data: assignedTenants, error: tenantsError } = await supabase
        .from("tenants")
        .select("user_id")
        .not("user_id", "is", null);

      if (tenantsError) throw tenantsError;

      const assignedUserIds = new Set(assignedTenants?.map((t) => t.user_id) || []);

      // Filter to only unassigned tenant users
      const availableUserIds = tenantUserIds.filter((id) => !assignedUserIds.has(id));

      if (availableUserIds.length === 0) {
        return [];
      }

      // Get profiles for available users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", availableUserIds);

      if (profilesError) throw profilesError;

      return (profiles || []).map((p) => ({
        user_id: p.user_id,
        email: p.email,
        full_name: p.full_name,
      })) as TenantUser[];
    },
    enabled: !!user && (isAdmin || isLandlord || isConsultant),
  });
}

/**
 * Fetches all users with the tenant role (for displaying tenant info)
 */
export function useAllTenantUsers() {
  const { user, isAdmin, isLandlord, isConsultant } = useAuth();

  return useQuery({
    queryKey: ["all-tenant-users"],
    queryFn: async () => {
      // Get users with tenant role
      const { data: tenantRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "tenant");

      if (rolesError) throw rolesError;

      const tenantUserIds = tenantRoles?.map((r) => r.user_id) || [];
      
      if (tenantUserIds.length === 0) {
        return [];
      }

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", tenantUserIds);

      if (profilesError) throw profilesError;

      return (profiles || []).map((p) => ({
        user_id: p.user_id,
        email: p.email,
        full_name: p.full_name,
      })) as TenantUser[];
    },
    enabled: !!user && (isAdmin || isLandlord || isConsultant),
  });
}
