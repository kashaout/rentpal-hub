import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const WORK_ORDER_STATUSES = [
  "created",
  "assigned",
  "accepted",
  "en_route",
  "on_site",
  "in_progress",
  "completed",
  "verified",
  "closed",
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export interface WorkOrder {
  id: string;
  maintenance_request_id: string;
  property_id: string;
  assigned_to: string | null;
  vendor_id: string | null;
  status: WorkOrderStatus;
  priority_score: number;
  severity: string;
  estimated_cost: number;
  actual_cost: number;
  labor_hours: number;
  parts_used: Database["public"]["Tables"]["work_orders"]["Row"]["parts_used"];
  approval_required: boolean;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  sla_response_deadline: string | null;
  sla_resolution_deadline: string | null;
  sla_response_met: boolean | null;
  sla_resolution_met: boolean | null;
  before_photos: string[];
  after_photos: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  verified_at: string | null;
  closed_at: string | null;
  // Joined fields
  property_name?: string;
  property_address?: string;
  request_title?: string;
  request_description?: string;
  assigned_user_name?: string | null;
  vendor_name?: string | null;
}

export function useWorkOrders(propertyId?: string) {
  return useQuery({
    queryKey: ["work-orders", propertyId],
    queryFn: async () => {
      let query = supabase
        .from("work_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const workOrders = (data || []) as unknown as WorkOrder[];

      // Fetch related data
      const propertyIds = [...new Set(workOrders.map((wo) => wo.property_id))];
      const requestIds = [...new Set(workOrders.map((wo) => wo.maintenance_request_id))];

      const [propertiesRes, requestsRes] = await Promise.all([
        propertyIds.length > 0
          ? supabase.from("properties").select("id, name, address").in("id", propertyIds)
          : { data: [] },
        requestIds.length > 0
          ? supabase.from("maintenance_requests").select("id, title, description").in("id", requestIds)
          : { data: [] },
      ]);

      const propMap = new Map((propertiesRes.data || []).map((p) => [p.id, p] as const));
      const reqMap = new Map((requestsRes.data || []).map((r) => [r.id, r] as const));

      return workOrders.map((wo) => {
        const prop = propMap.get(wo.property_id);
        const req = reqMap.get(wo.maintenance_request_id);
        return {
          ...wo,
          property_name: prop?.name || "Unknown",
          property_address: prop?.address || "",
          request_title: req?.title || "Unknown",
          request_description: req?.description || "",
        };
      });
    },
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      maintenance_request_id: string;
      property_id: string;
      severity: string;
      assigned_to?: string;
      vendor_id?: string;
      notes?: string;
      priority_score?: number;
    }) => {
      // Fetch SLA config for the severity
      const { data: slaConfig } = await supabase
        .from("sla_configs")
        .select("*")
        .eq("severity", input.severity)
        .single();

      const now = new Date();
      const sla = slaConfig;
      const slaResponseDeadline = sla
        ? new Date(now.getTime() + sla.response_minutes * 60000).toISOString()
        : null;
      const slaResolutionDeadline = sla
        ? new Date(now.getTime() + sla.resolution_minutes * 60000).toISOString()
        : null;

      const { data, error } = await supabase
        .from("work_orders")
        .insert({
          ...input,
          status: input.assigned_to || input.vendor_id ? "assigned" : "created",
          sla_response_deadline: slaResponseDeadline,
          sla_resolution_deadline: slaResolutionDeadline,
          priority_score: input.priority_score || calculatePriorityScore(input.severity),
        })
        .select()
        .single();

      if (error) throw error;

      // Log the creation
      await supabase.from("maintenance_logs").insert({
        work_order_id: data.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        new_status: input.assigned_to || input.vendor_id ? "assigned" : "created",
        action: "work_order_created",
        details: `Work order created with ${input.severity} severity`,
      });

      return data as unknown as WorkOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      toast.success("Work order created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create work order: ${error.message}`);
    },
  });
}

export function useUpdateWorkOrderStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workOrderId,
      newStatus,
      notes,
      actualCost,
      laborHours,
      partsUsed,
    }: {
      workOrderId: string;
      newStatus: WorkOrderStatus;
      notes?: string;
      actualCost?: number;
      laborHours?: number;
      partsUsed?: Database["public"]["Tables"]["work_orders"]["Row"]["parts_used"];
    }) => {
      // Get current work order
      const { data: current } = await supabase
        .from("work_orders")
        .select("*")
        .eq("id", workOrderId)
        .single();

      const currentWo = current;

      const updates: Database["public"]["Tables"]["work_orders"]["Update"] = { status: newStatus };

      if (notes) updates.notes = notes;
      if (actualCost !== undefined) updates.actual_cost = actualCost;
      if (laborHours !== undefined) updates.labor_hours = laborHours;
      if (partsUsed) updates.parts_used = partsUsed;

      // Track SLA compliance
      const now = new Date();
      if (newStatus === "accepted" && currentWo?.sla_response_deadline) {
        updates.sla_response_met = now <= new Date(currentWo.sla_response_deadline);
      }
      if (newStatus === "completed") {
        updates.completed_at = now.toISOString();
        if (currentWo?.sla_resolution_deadline) {
          updates.sla_resolution_met = now <= new Date(currentWo.sla_resolution_deadline);
        }

        // Check if cost exceeds property approval threshold
        const totalCost = actualCost || currentWo?.actual_cost || 0;
        if (totalCost > 0 && currentWo) {
          const { data: property } = await supabase
            .from("properties")
            .select("approval_threshold")
            .eq("id", currentWo.property_id)
            .single();

          if (property?.approval_threshold != null && totalCost > property.approval_threshold) {
            updates.approval_required = true;
            updates.approval_status = "pending";
            updates.status = "completed"; // Stay at completed until approved
          }
        }
      }
      if (newStatus === "verified") updates.verified_at = now.toISOString();
      if (newStatus === "closed") updates.closed_at = now.toISOString();

      const { error } = await supabase
        .from("work_orders")
        .update(updates)
        .eq("id", workOrderId);

      if (error) throw error;

      // Log the status change
      await supabase.from("maintenance_logs").insert({
        work_order_id: workOrderId,
        user_id: user?.id,
        previous_status: currentWo?.status,
        new_status: newStatus,
        action: "status_change",
        details: notes || `Status changed to ${newStatus}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      toast.success("Work order updated");
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
}

function calculatePriorityScore(severity: string, hasActiveBooking = false): number {
  const severityWeights: Record<string, number> = {
    emergency: 10,
    high: 7,
    medium: 4,
    low: 2,
  };
  const severityWeight = severityWeights[severity] || 4;
  const bookingFlag = hasActiveBooking ? 1 : 0;
  return severityWeight * 0.5 + 5 * 0.3 + bookingFlag * 10 * 0.2;
}
