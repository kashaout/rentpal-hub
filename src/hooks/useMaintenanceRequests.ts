import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";

export interface MaintenanceRequest {
  id: string;
  tenant_id: string;
  property_id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  repair_notes: string | null;
  photo_urls: string[] | null;
}

export interface MaintenanceRequestWithDetails extends MaintenanceRequest {
  property_name: string;
  property_address: string;
}

export function useMaintenanceRequests(tenantId?: string) {
  return useQuery({
    queryKey: ["maintenance-requests", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("maintenance_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch property details
      const propertyIds = [...new Set(data.map((r) => r.property_id))];
      const { data: properties } = await supabase
        .from("properties")
        .select("id, name, address")
        .in("id", propertyIds);

      const propertiesMap = new Map(properties?.map((p) => [p.id, p]) || []);

      return data.map((request) => {
        const property = propertiesMap.get(request.property_id);
        return {
          ...request,
          property_name: property?.name || "Unknown",
          property_address: property?.address || "",
        };
      }) as MaintenanceRequestWithDetails[];
    },
  });
}

interface CreateMaintenanceRequestInput {
  tenant_id: string;
  property_id: string;
  title: string;
  description: string;
  priority?: "low" | "medium" | "high" | "urgent";
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMaintenanceRequestInput) => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .insert({
          tenant_id: input.tenant_id,
          property_id: input.property_id,
          title: input.title,
          description: input.description,
          priority: input.priority || "medium",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      toast({
        title: "Request submitted",
        description: "Your maintenance request has been submitted successfully.",
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

interface UpdateMaintenanceRequestInput {
  id: string;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  resolved_at?: string | null;
  repair_notes?: string;
  photo_urls?: string[];
}

export function useUpdateMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateMaintenanceRequestInput) => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      toast({
        title: "Request updated",
        description: "The maintenance request has been updated.",
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
