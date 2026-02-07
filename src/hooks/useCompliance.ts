import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";

export type ComplianceCategory = 
  | "tenancy_agreement"
  | "land_title"
  | "service_charge"
  | "building_permit"
  | "fire_safety"
  | "environmental"
  | "utility_registration"
  | "insurance"
  | "other";

export type ComplianceStatus = 
  | "compliant"
  | "pending"
  | "expired"
  | "non_compliant"
  | "not_applicable";

export interface ComplianceItem {
  id: string;
  property_id: string;
  category: ComplianceCategory;
  name: string;
  description: string | null;
  status: ComplianceStatus;
  issue_date: string | null;
  expiry_date: string | null;
  reminder_days: number;
  document_url: string | null;
  notes: string | null;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  inspector_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceItemWithProperty extends ComplianceItem {
  property_name: string;
  property_address: string;
  days_until_expiry: number | null;
}

export interface ComplianceAlert {
  id: string;
  compliance_item_id: string;
  property_id: string;
  alert_type: "expiring_soon" | "expired" | "inspection_due" | "action_required";
  message: string;
  is_dismissed: boolean;
  dismissed_at: string | null;
  dismissed_by: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<ComplianceCategory, string> = {
  tenancy_agreement: "Tenancy Agreement",
  land_title: "Land Title / C of O",
  service_charge: "Service Charge",
  building_permit: "Building Permit",
  fire_safety: "Fire Safety",
  environmental: "Environmental",
  utility_registration: "Utility Registration",
  insurance: "Insurance",
  other: "Other",
};

export const STATUS_LABELS: Record<ComplianceStatus, string> = {
  compliant: "Compliant",
  pending: "Pending",
  expired: "Expired",
  non_compliant: "Non-Compliant",
  not_applicable: "N/A",
};

export function useComplianceItems(propertyId?: string) {
  return useQuery({
    queryKey: ["compliance-items", propertyId],
    queryFn: async () => {
      let query = supabase
        .from("compliance_items")
        .select("*")
        .order("expiry_date", { ascending: true, nullsFirst: false });

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch property details
      const propertyIds = [...new Set(data.map((item) => item.property_id))];
      const { data: properties } = await supabase
        .from("properties")
        .select("id, name, address")
        .in("id", propertyIds);

      const propertiesMap = new Map(properties?.map((p) => [p.id, p]) || []);

      const today = new Date();
      return data.map((item) => {
        const property = propertiesMap.get(item.property_id);
        const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
        const daysUntilExpiry = expiryDate
          ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...item,
          property_name: property?.name || "Unknown",
          property_address: property?.address || "",
          days_until_expiry: daysUntilExpiry,
        } as ComplianceItemWithProperty;
      });
    },
  });
}

export function useComplianceAlerts() {
  return useQuery({
    queryKey: ["compliance-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_alerts")
        .select("*")
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ComplianceAlert[];
    },
  });
}

interface CreateComplianceItemInput {
  property_id: string;
  category: ComplianceCategory;
  name: string;
  description?: string;
  status?: ComplianceStatus;
  issue_date?: string;
  expiry_date?: string;
  reminder_days?: number;
  document_url?: string;
  notes?: string;
  last_inspection_date?: string;
  next_inspection_date?: string;
  inspector_name?: string;
}

export function useCreateComplianceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateComplianceItemInput) => {
      const { data, error } = await supabase
        .from("compliance_items")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-items"] });
      queryClient.invalidateQueries({ queryKey: ["property-compliance-score"] });
      toast({
        title: "Compliance item added",
        description: "The compliance item has been created successfully.",
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

interface UpdateComplianceItemInput {
  id: string;
  category?: ComplianceCategory;
  name?: string;
  description?: string;
  status?: ComplianceStatus;
  issue_date?: string | null;
  expiry_date?: string | null;
  reminder_days?: number;
  document_url?: string | null;
  notes?: string | null;
  last_inspection_date?: string | null;
  next_inspection_date?: string | null;
  inspector_name?: string | null;
}

export function useUpdateComplianceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateComplianceItemInput) => {
      const { data, error } = await supabase
        .from("compliance_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-items"] });
      queryClient.invalidateQueries({ queryKey: ["property-compliance-score"] });
      toast({
        title: "Compliance item updated",
        description: "The compliance item has been updated successfully.",
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

export function useDeleteComplianceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("compliance_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-items"] });
      queryClient.invalidateQueries({ queryKey: ["property-compliance-score"] });
      toast({
        title: "Compliance item deleted",
        description: "The compliance item has been removed.",
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

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("compliance_alerts")
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-alerts"] });
    },
  });
}

// Calculate compliance score for a property (0-100)
export function calculateComplianceScore(items: ComplianceItem[]): number {
  if (items.length === 0) return 100;

  const applicableItems = items.filter((item) => item.status !== "not_applicable");
  if (applicableItems.length === 0) return 100;

  const weights: Record<ComplianceStatus, number> = {
    compliant: 100,
    pending: 50,
    expired: 0,
    non_compliant: 0,
    not_applicable: 100,
  };

  const totalScore = applicableItems.reduce((sum, item) => sum + weights[item.status], 0);
  return Math.round(totalScore / applicableItems.length);
}

export function usePropertyComplianceScore(propertyId: string) {
  return useQuery({
    queryKey: ["property-compliance-score", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_items")
        .select("status")
        .eq("property_id", propertyId);

      if (error) throw error;
      return calculateComplianceScore(data as ComplianceItem[]);
    },
    enabled: !!propertyId,
  });
}
