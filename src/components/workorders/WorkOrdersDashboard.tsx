import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Wrench, Clock, CheckCircle2, AlertCircle, AlertTriangle,
  Loader2, Building2, User, ArrowRight, Timer, Shield,
  ChevronRight, DollarSign, Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkOrders, useUpdateWorkOrderStatus, WORK_ORDER_STATUSES, WorkOrder, WorkOrderStatus } from "@/hooks/useWorkOrders";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock; step: number }> = {
  created: { label: "Created", color: "bg-muted text-muted-foreground", icon: Clock, step: 0 },
  assigned: { label: "Assigned", color: "bg-primary/10 text-primary", icon: User, step: 1 },
  accepted: { label: "Accepted", color: "bg-accent/10 text-accent", icon: CheckCircle2, step: 2 },
  en_route: { label: "En Route", color: "bg-warning/10 text-warning", icon: ArrowRight, step: 3 },
  on_site: { label: "On Site", color: "bg-warning/10 text-warning", icon: Building2, step: 4 },
  in_progress: { label: "In Progress", color: "bg-accent/10 text-accent", icon: Wrench, step: 5 },
  completed: { label: "Completed", color: "bg-success/10 text-success", icon: CheckCircle2, step: 6 },
  verified: { label: "Verified", color: "bg-success/10 text-success", icon: Shield, step: 7 },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground", icon: CheckCircle2, step: 8 },
};

function SLAIndicator({ deadline, met }: { deadline: string | null; met: boolean | null }) {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const isOverdue = now > deadlineDate && met === null;
  const isPassed = met === false;
  const isOk = met === true;

  return (
    <div className={cn(
      "flex items-center gap-1 text-xs font-medium",
      isOk ? "text-success" : isPassed || isOverdue ? "text-destructive" : "text-warning"
    )}>
      <Timer className="h-3 w-3" />
      {isOk ? "SLA Met" : isPassed ? "SLA Breached" : isOverdue ? "Overdue" : formatDistanceToNow(deadlineDate, { addSuffix: true })}
    </div>
  );
}

function WorkOrderCard({ wo, onUpdate }: { wo: WorkOrder; onUpdate: (wo: WorkOrder) => void }) {
  const config = statusConfig[wo.status] || statusConfig.created;
  const StatusIcon = config.icon;
  const progressPercent = (config.step / 8) * 100;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onUpdate(wo)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">{wo.request_title}</h4>
            <p className="text-xs text-muted-foreground">{wo.property_name}</p>
          </div>
          <Badge variant="outline" className={cn("capitalize text-xs", config.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        <Progress value={progressPercent} className="h-1.5" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {wo.severity && (
              <Badge variant="outline" className={cn("text-xs mr-2",
                wo.severity === "emergency" ? "text-destructive border-destructive/30" :
                wo.severity === "high" ? "text-warning border-warning/30" :
                "text-muted-foreground"
              )}>
                {wo.severity}
              </Badge>
            )}
            {format(new Date(wo.created_at), "MMM d, yyyy")}
          </span>
          <div className="flex items-center gap-3">
            <SLAIndicator deadline={wo.sla_response_deadline} met={wo.sla_response_met} />
            {wo.actual_cost > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(wo.actual_cost)}
              </span>
            )}
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UpdateWorkOrderDialog({
  workOrder,
  open,
  onOpenChange,
}: {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateStatus = useUpdateWorkOrderStatus();
  const [newStatus, setNewStatus] = useState<WorkOrderStatus>("assigned");
  const [notes, setNotes] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [laborHours, setLaborHours] = useState("");

  if (!workOrder) return null;

  const currentStep = statusConfig[workOrder.status]?.step || 0;
  const availableStatuses = WORK_ORDER_STATUSES.filter((s) => {
    const step = statusConfig[s]?.step || 0;
    return step > currentStep;
  });

  const handleSubmit = async () => {
    await updateStatus.mutateAsync({
      workOrderId: workOrder.id,
      newStatus,
      notes: notes || undefined,
      actualCost: actualCost ? Number(actualCost) : undefined,
      laborHours: laborHours ? Number(laborHours) : undefined,
    });
    onOpenChange(false);
    setNotes("");
    setActualCost("");
    setLaborHours("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Work Order</DialogTitle>
          <DialogDescription>{workOrder.request_title} — {workOrder.property_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current Status */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Current:</span>
            <Badge variant="outline" className={statusConfig[workOrder.status]?.color}>
              {statusConfig[workOrder.status]?.label}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as WorkOrderStatus)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{statusConfig[s]?.label || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SLA Info */}
          <div className="rounded-lg bg-muted/50 p-3 flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Response SLA</p>
              <SLAIndicator deadline={workOrder.sla_response_deadline} met={workOrder.sla_response_met} />
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div>
              <p className="text-xs text-muted-foreground">Resolution SLA</p>
              <SLAIndicator deadline={workOrder.sla_resolution_deadline} met={workOrder.sla_resolution_met} />
            </div>
          </div>

          {/* Cost fields for completion */}
          {(newStatus === "completed" || newStatus === "verified") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Actual Cost</Label>
                <Input type="number" value={actualCost} onChange={(e) => setActualCost(e.target.value)} placeholder="0.00" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Labor Hours</Label>
                <Input type="number" value={laborHours} onChange={(e) => setLaborHours(e.target.value)} placeholder="0" className="mt-1" />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." className="mt-1 h-20" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateStatus.isPending} className="gap-2">
            {updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkOrdersDashboard() {
  const { data: workOrders = [], isLoading } = useWorkOrders();
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const stats = {
    total: workOrders.length,
    active: workOrders.filter((wo) => !["completed", "verified", "closed"].includes(wo.status)).length,
    slaBreaches: workOrders.filter((wo) => wo.sla_response_met === false || wo.sla_resolution_met === false).length,
    completed: workOrders.filter((wo) => wo.status === "completed" || wo.status === "verified" || wo.status === "closed").length,
  };

  const filtered = statusFilter === "all"
    ? workOrders
    : statusFilter === "active"
    ? workOrders.filter((wo) => !["completed", "verified", "closed"].includes(wo.status))
    : workOrders.filter((wo) => wo.status === statusFilter);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <Wrench className="h-4 w-4 text-accent absolute right-4 top-4" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SLA Breaches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive absolute right-4 top-4" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{stats.slaBreaches}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success absolute right-4 top-4" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter + List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Work Orders</CardTitle>
            <CardDescription>9-stage lifecycle with SLA tracking</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              {WORK_ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{statusConfig[s]?.label || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((wo) => (
                <WorkOrderCard key={wo.id} wo={wo} onUpdate={(wo) => { setSelectedWO(wo); setUpdateOpen(true); }} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Wrench className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2">No work orders found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <UpdateWorkOrderDialog workOrder={selectedWO} open={updateOpen} onOpenChange={setUpdateOpen} />
    </div>
  );
}
