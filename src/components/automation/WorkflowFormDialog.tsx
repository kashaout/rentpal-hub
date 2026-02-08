import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { 
  useAutomationWorkflows, 
  useCreateWorkflow, 
  useUpdateWorkflow,
  WORKFLOW_TEMPLATES,
  WorkflowType,
} from "@/hooks/useAutomationWorkflows";

const formSchema = z.object({
  workflow_type: z.enum(["overdue_rent", "lease_expiry", "low_occupancy", "compliance_expiry", "high_maintenance"]),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  days_before: z.coerce.number().min(1).optional(),
  days_overdue: z.coerce.number().min(1).optional(),
  occupancy_threshold: z.coerce.number().min(0).max(100).optional(),
  cost_threshold: z.coerce.number().min(0).optional(),
  notify_email: z.boolean().default(false),
  notify_in_app: z.boolean().default(true),
  escalate_after_days: z.coerce.number().min(1).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface WorkflowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId?: string | null;
}

export function WorkflowFormDialog({ open, onOpenChange, workflowId }: WorkflowFormDialogProps) {
  const { data: workflows = [] } = useAutomationWorkflows();
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const isEditing = !!workflowId;
  const existingWorkflow = workflows.find(w => w.id === workflowId);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workflow_type: "overdue_rent",
      name: "",
      description: "",
      days_before: 30,
      days_overdue: 3,
      occupancy_threshold: 70,
      cost_threshold: 50000,
      notify_email: false,
      notify_in_app: true,
      escalate_after_days: 7,
    },
  });

  const workflowType = form.watch("workflow_type") as WorkflowType;

  useEffect(() => {
    if (existingWorkflow) {
      form.reset({
        workflow_type: existingWorkflow.workflow_type as WorkflowType,
        name: existingWorkflow.name,
        description: existingWorkflow.description || "",
        days_before: existingWorkflow.trigger_config.days_before || 30,
        days_overdue: existingWorkflow.trigger_config.days_overdue || 3,
        occupancy_threshold: existingWorkflow.trigger_config.occupancy_threshold || 70,
        cost_threshold: existingWorkflow.trigger_config.cost_threshold || 50000,
        notify_email: existingWorkflow.action_config.notify_email || false,
        notify_in_app: existingWorkflow.action_config.notify_in_app || true,
        escalate_after_days: existingWorkflow.action_config.escalate_after_days || 7,
      });
    } else if (!isEditing) {
      const template = WORKFLOW_TEMPLATES.overdue_rent;
      form.reset({
        workflow_type: "overdue_rent",
        name: template.name,
        description: template.description,
        days_overdue: 3,
        notify_in_app: true,
      });
    }
  }, [existingWorkflow, isEditing, form, open]);

  // Update name when type changes (only for new workflows)
  useEffect(() => {
    if (!isEditing && workflowType) {
      const template = WORKFLOW_TEMPLATES[workflowType];
      form.setValue("name", template.name);
      form.setValue("description", template.description);
    }
  }, [workflowType, isEditing, form]);

  const onSubmit = async (data: FormData) => {
    const trigger_config: Record<string, number> = {};
    const action_config: Record<string, boolean | number> = {
      notify_email: data.notify_email,
      notify_in_app: data.notify_in_app,
    };

    // Set trigger config based on type
    if (data.workflow_type === "overdue_rent" && data.days_overdue) {
      trigger_config.days_overdue = data.days_overdue;
      if (data.escalate_after_days) action_config.escalate_after_days = data.escalate_after_days;
    } else if (["lease_expiry", "compliance_expiry"].includes(data.workflow_type) && data.days_before) {
      trigger_config.days_before = data.days_before;
    } else if (data.workflow_type === "low_occupancy" && data.occupancy_threshold) {
      trigger_config.occupancy_threshold = data.occupancy_threshold;
    } else if (data.workflow_type === "high_maintenance" && data.cost_threshold) {
      trigger_config.cost_threshold = data.cost_threshold;
    }

    if (isEditing && workflowId) {
      await updateWorkflow.mutateAsync({
        id: workflowId,
        name: data.name,
        description: data.description,
        trigger_config,
        action_config,
      });
    } else {
      await createWorkflow.mutateAsync({
        workflow_type: data.workflow_type,
        name: data.name,
        description: data.description,
        trigger_config,
        action_config,
      });
    }

    onOpenChange(false);
  };

  const isPending = createWorkflow.isPending || updateWorkflow.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Workflow" : "Create Workflow"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the settings for this automation workflow."
              : "Set up automatic notifications for important property events."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="workflow_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workflow Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(WORKFLOW_TEMPLATES).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span>{template.icon}</span>
                            <span>{template.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Workflow name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Optional description" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional trigger fields */}
            {workflowType === "overdue_rent" && (
              <>
                <FormField
                  control={form.control}
                  name="days_overdue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Overdue</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={1} />
                      </FormControl>
                      <FormDescription>Alert after this many days overdue</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="escalate_after_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escalate After (days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={1} />
                      </FormControl>
                      <FormDescription>Escalate severity if still unpaid</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {(workflowType === "lease_expiry" || workflowType === "compliance_expiry") && (
              <FormField
                control={form.control}
                name="days_before"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days Before Expiry</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={1} />
                    </FormControl>
                    <FormDescription>Alert this many days before expiry</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {workflowType === "low_occupancy" && (
              <FormField
                control={form.control}
                name="occupancy_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occupancy Threshold (%)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={0} max={100} />
                    </FormControl>
                    <FormDescription>Alert when occupancy falls below this percentage</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {workflowType === "high_maintenance" && (
              <FormField
                control={form.control}
                name="cost_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Threshold</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={0} />
                    </FormControl>
                    <FormDescription>Alert when maintenance costs exceed this amount</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-3 pt-2">
              <FormLabel>Notification Methods</FormLabel>
              <FormField
                control={form.control}
                name="notify_in_app"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="font-normal">In-App Notification</FormLabel>
                      <FormDescription className="text-xs">Show alerts in the dashboard</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notify_email"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="font-normal">Email Notification</FormLabel>
                      <FormDescription className="text-xs">Send email alerts</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Workflow"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
