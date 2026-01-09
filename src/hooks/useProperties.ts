import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Property {
  id: string;
  name: string;
  address: string;
  units: number;
  monthly_rent: number;
  image_url: string | null;
  landlord_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyWithStats extends Property {
  occupied_units: number;
}

export interface CreatePropertyData {
  name: string;
  address: string;
  units: number;
  monthly_rent: number;
  image_url?: string;
}

export interface UpdatePropertyData extends Partial<CreatePropertyData> {
  id: string;
}

export function useProperties() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data: properties, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get tenant counts for each property
      const propertiesWithStats: PropertyWithStats[] = await Promise.all(
        (properties || []).map(async (property) => {
          const { count } = await supabase
            .from("tenants")
            .select("*", { count: "exact", head: true })
            .eq("property_id", property.id);

          return {
            ...property,
            occupied_units: count || 0,
          };
        })
      );

      return propertiesWithStats;
    },
    enabled: !!user,
  });
}

export function useProperty(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Property | null;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePropertyData) => {
      const { data: property, error } = await supabase
        .from("properties")
        .insert({
          ...data,
          landlord_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: "Property created successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create property",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePropertyData) => {
      const { data: property, error } = await supabase
        .from("properties")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return property;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["property", variables.id] });
      toast({ title: "Property updated successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update property",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: "Property deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete property",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
