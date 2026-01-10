import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface UserWithRoles {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  roles: Array<"admin" | "consultant" | "landlord" | "tenant">;
}

export interface ConsultantAssignment {
  id: string;
  consultant_id: string;
  property_id: string;
  assigned_at: string;
  consultant_name: string;
  consultant_email: string;
  property_name: string;
  property_address: string;
}

// Fetch all users with their roles (admin only)
export function useAllUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Merge roles into users
      const usersWithRoles: UserWithRoles[] = profiles.map((profile) => ({
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        phone: profile.phone,
        created_at: profile.created_at,
        roles: userRoles
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role) as Array<"admin" | "consultant" | "landlord" | "tenant">,
      }));

      return usersWithRoles;
    },
  });
}

// Fetch all consultants (users with consultant role)
export function useConsultants() {
  return useQuery({
    queryKey: ["admin", "consultants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles!inner (
            id,
            user_id,
            email,
            full_name
          )
        `)
        .eq("role", "consultant");

      if (error) throw error;

      return data.map((item: any) => ({
        user_id: item.user_id,
        id: item.profiles.id,
        email: item.profiles.email,
        full_name: item.profiles.full_name,
      }));
    },
  });
}

// Fetch all consultant assignments
export function useConsultantAssignments() {
  return useQuery({
    queryKey: ["admin", "consultant-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultant_assignments")
        .select(`
          *,
          profiles!consultant_assignments_consultant_id_fkey (
            full_name,
            email
          ),
          properties!consultant_assignments_property_id_fkey (
            name,
            address
          )
        `)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        consultant_id: item.consultant_id,
        property_id: item.property_id,
        assigned_at: item.assigned_at,
        consultant_name: item.profiles?.full_name || "Unknown",
        consultant_email: item.profiles?.email || "",
        property_name: item.properties?.name || "Unknown",
        property_address: item.properties?.address || "",
      })) as ConsultantAssignment[];
    },
  });
}

// Add role to user
export function useAddRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "consultant" | "landlord" | "tenant";
    }) => {
      const { data, error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({
        title: "Role added",
        description: "The role has been assigned successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Remove role from user
export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "consultant" | "landlord" | "tenant";
    }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({
        title: "Role removed",
        description: "The role has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Assign consultant to property
export function useAssignConsultant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      consultantId,
      propertyId,
    }: {
      consultantId: string;
      propertyId: string;
    }) => {
      const { data, error } = await supabase
        .from("consultant_assignments")
        .insert({ consultant_id: consultantId, property_id: propertyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "consultant-assignments"] });
      toast({
        title: "Consultant assigned",
        description: "The consultant has been assigned to the property.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Remove consultant assignment
export function useRemoveAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("consultant_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "consultant-assignments"] });
      toast({
        title: "Assignment removed",
        description: "The consultant assignment has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
