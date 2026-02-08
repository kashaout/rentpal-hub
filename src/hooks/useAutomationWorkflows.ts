import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";
import type { Json } from "@/integrations/supabase/types";

export type WorkflowType = "overdue_rent" | "lease_expiry" | "low_occupancy" | "compliance_expiry" | "high_maintenance";

export interface TriggerConfig {
  days_before?: number;
  days_overdue?: number;
  occupancy_threshold?: number;
  cost_threshold?: number;
}

export interface ActionConfig {
  notify_email?: boolean;
  notify_in_app?: boolean;
  escalate_after_days?: number;
  auto_reminder?: boolean;
}

export interface AutomationWorkflow {
  id: string;
  user_id: string;
  workflow_type: WorkflowType;
  name: string;
  description: string | null;
  is_enabled: boolean;
  trigger_config: TriggerConfig;
  action_config: ActionConfig;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowAlert {
  id: string;
  workflow_id: string;
  user_id: string;
  property_id: string | null;
  tenant_id: string | null;
  alert_type: WorkflowType;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  is_read: boolean;
  is_dismissed: boolean;
  metadata: Record<string, unknown>;
  triggered_at: string;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export const WORKFLOW_TEMPLATES: Record<WorkflowType, {
  name: string;
  description: string;
  icon: string;
  defaultTrigger: TriggerConfig;
  defaultAction: ActionConfig;
}> = {
  overdue_rent: {
    name: "Overdue Rent Alert",
    description: "Get notified when rent payments are overdue",
    icon: "💰",
    defaultTrigger: { days_overdue: 3 },
    defaultAction: { notify_in_app: true, notify_email: true, escalate_after_days: 7 },
  },
  lease_expiry: {
    name: "Lease Expiry Reminder",
    description: "Receive reminders before leases expire",
    icon: "📄",
    defaultTrigger: { days_before: 60 },
    defaultAction: { notify_in_app: true, auto_reminder: true },
  },
  low_occupancy: {
    name: "Low Occupancy Warning",
    description: "Alert when property occupancy falls below threshold",
    icon: "🏠",
    defaultTrigger: { occupancy_threshold: 70 },
    defaultAction: { notify_in_app: true },
  },
  compliance_expiry: {
    name: "Compliance Expiry Alert",
    description: "Get notified before compliance items expire",
    icon: "✅",
    defaultTrigger: { days_before: 30 },
    defaultAction: { notify_in_app: true, notify_email: true },
  },
  high_maintenance: {
    name: "High Maintenance Cost Warning",
    description: "Alert when maintenance costs exceed threshold",
    icon: "🔧",
    defaultTrigger: { cost_threshold: 50000 },
    defaultAction: { notify_in_app: true },
  },
};

export function useAutomationWorkflows() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["automation-workflows", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("automation_workflows")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(w => ({
        ...w,
        trigger_config: w.trigger_config as TriggerConfig,
        action_config: w.action_config as ActionConfig,
      })) as AutomationWorkflow[];
    },
    enabled: !!user,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      workflow_type: WorkflowType;
      name: string;
      description?: string;
      trigger_config: TriggerConfig;
      action_config: ActionConfig;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: workflow, error } = await supabase
        .from("automation_workflows")
        .insert([{
          user_id: user.id,
          workflow_type: data.workflow_type,
          name: data.name,
          description: data.description,
          trigger_config: data.trigger_config as Json,
          action_config: data.action_config as Json,
        }])
        .select()
        .single();

      if (error) throw error;
      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-workflows"] });
      toast({ title: "Workflow created successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create workflow",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AutomationWorkflow> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.is_enabled !== undefined) updateData.is_enabled = data.is_enabled;
      if (data.trigger_config !== undefined) updateData.trigger_config = data.trigger_config;
      if (data.action_config !== undefined) updateData.action_config = data.action_config;

      const { data: workflow, error } = await supabase
        .from("automation_workflows")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-workflows"] });
      toast({ title: "Workflow updated!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update workflow",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automation_workflows")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-workflows"] });
      toast({ title: "Workflow deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete workflow",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useWorkflowAlerts(unreadOnly = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workflow-alerts", user?.id, unreadOnly],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("workflow_alerts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_dismissed", false)
        .order("triggered_at", { ascending: false })
        .limit(50);

      if (unreadOnly) {
        query = query.eq("is_read", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as WorkflowAlert[];
    },
    enabled: !!user,
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("workflow_alerts")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-alerts"] });
    },
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("workflow_alerts")
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-alerts"] });
    },
  });
}

export function useUnreadAlertCount() {
  const { data: alerts } = useWorkflowAlerts(true);
  return alerts?.length || 0;
}
