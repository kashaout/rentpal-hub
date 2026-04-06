import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Wrench, Star, Camera, FileText, ChevronDown, ChevronUp, Plus, Banknote } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCreateWorkOrder } from "@/hooks/useWorkOrders";
import { useMaintenanceUsers } from "@/hooks/useMaintenanceUsers";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  propertyId: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  urgent: "bg-destructive text-destructive-foreground",
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-muted text-muted-foreground",
};

const woStatusColors: Record<string, string> = {
  created: "bg-muted text-muted-foreground",
  assigned: "bg-primary/10 text-primary",
  in_progress: "bg-accent/10 text-accent",
  completed: "bg-success/10 text-success",
  verified: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
};

export function PropertyIssuesTab({ propertyId }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createWOForRequest, setCreateWOForRequest] = useState<any | null>(null);

  const { data: issues, isLoading } = useQuery({
    queryKey: ["property-issues-full", propertyId],
    queryFn: async () => {
      // Get maintenance requests
      const { data: requests, error } = await supabase
        .from("maintenance_requests")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get work orders for this property
      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("*")
        .eq("property_id", propertyId);

      // Get maintenance logs for work orders
      const woIds = (workOrders || []).map((wo: any) => wo.id);
      let logs: any[] = [];
      if (woIds.length > 0) {
        const { data: logsData } = await supabase
          .from("maintenance_logs")
          .select("*")
          .in("work_order_id", woIds)
          .order("created_at", { ascending: false });
        logs = logsData || [];
      }

      // Get reviews for maintenance requests
      const requestIds = (requests || []).map((r: any) => r.id);
      // Reviews are linked by tenant_id via maintenance_requests, we look for rating on requests
      
      // Map work orders to requests
      const woMap = new Map<string, any[]>();
      (workOrders || []).forEach((wo: any) => {
        const existing = woMap.get(wo.maintenance_request_id) || [];
        existing.push(wo);
        woMap.set(wo.maintenance_request_id, existing);
      });

      const logsMap = new Map<string, any[]>();
      logs.forEach((log: any) => {
        const existing = logsMap.get(log.work_order_id) || [];
        existing.push(log);
        logsMap.set(log.work_order_id, existing);
      });

      return (requests || []).map((req: any) => ({
        ...req,
        work_orders: (woMap.get(req.id) || []).map((wo: any) => ({
          ...wo,
          logs: logsMap.get(wo.id) || [],
        })),
      }));
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!issues?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No maintenance issues reported.</CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <span className="hover:text-foreground cursor-pointer">Property</span>
        <span>›</span>
        <span className="hover:text-foreground cursor-pointer">Tenant</span>
        <span>›</span>
        <span className="text-foreground font-medium">Issues</span>
        <span>›</span>
        <span>Work Orders</span>
      </div>

      {issues.map((issue: any) => {
        const isExpanded = expandedId === issue.id;
        const hasWO = issue.work_orders.length > 0;

        return (
          <Card key={issue.id}>
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm">{issue.title}</h4>
                    <Badge variant="outline" className={priorityColors[issue.priority] || ""}>{issue.priority}</Badge>
                    <Badge variant="outline" className={statusColors[issue.status] || ""}>{issue.status.replace("_", " ")}</Badge>
                    {hasWO && <Badge variant="outline" className="bg-primary/5 text-xs">WO Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{issue.description}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(issue.created_at), "MMM d, yyyy")}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!hasWO && issue.status !== "completed" && issue.status !== "cancelled" && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setCreateWOForRequest(issue)}>
                      <Plus className="h-3 w-3" /> Create Work Order
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setExpandedId(isExpanded ? null : issue.id)}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-4 space-y-4">
                  {/* Rating */}
                  {issue.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 text-warning fill-warning" />
                      <span className="font-medium">{issue.rating}/5</span>
                      <span className="text-muted-foreground">tenant rating</span>
                    </div>
                  )}

                  {/* Repair notes */}
                  {issue.repair_notes && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs font-medium flex items-center gap-1 mb-1"><FileText className="h-3 w-3" /> Repair Notes</p>
                      <p className="text-sm text-muted-foreground">{issue.repair_notes}</p>
                    </div>
                  )}

                  {/* Photos */}
                  {issue.photo_urls?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Camera className="h-3 w-3" /> {issue.photo_urls.length} photo(s) attached
                    </div>
                  )}

                  {/* Work Orders */}
                  {issue.work_orders.map((wo: any) => (
                    <div key={wo.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Work Order</span>
                          <Badge variant="outline" className={woStatusColors[wo.status] || ""}>{wo.status.replace("_", " ")}</Badge>
                          <Badge variant="outline" className="text-xs capitalize">{wo.severity}</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Est. Cost:</span>
                          <span className="ml-1 font-medium">{wo.estimated_cost ? formatCurrency(Number(wo.estimated_cost)) : "–"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Actual:</span>
                          <span className="ml-1 font-medium">{wo.actual_cost ? formatCurrency(Number(wo.actual_cost)) : "–"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Labor:</span>
                          <span className="ml-1 font-medium">{wo.labor_hours ? `${wo.labor_hours}h` : "–"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <span className="ml-1">{format(new Date(wo.created_at), "MMM d")}</span>
                        </div>
                      </div>

                      {wo.notes && <p className="text-xs text-muted-foreground">{wo.notes}</p>}

                      {/* Before/After photos */}
                      <div className="flex gap-4 text-xs">
                        {wo.before_photos?.length > 0 && (
                          <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> {wo.before_photos.length} before</span>
                        )}
                        {wo.after_photos?.length > 0 && (
                          <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> {wo.after_photos.length} after</span>
                        )}
                      </div>

                      {/* Logs */}
                      {wo.logs.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <Separator />
                          <p className="text-xs font-medium pt-1">Activity Log</p>
                          {wo.logs.slice(0, 5).map((log: any) => (
                            <div key={log.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{format(new Date(log.created_at), "MMM d, h:mm a")}</span>
                              <span>–</span>
                              <span>{log.action.replace(/_/g, " ")}</span>
                              {log.details && <span className="truncate max-w-[200px]">: {log.details}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Create Work Order Dialog */}
      <CreateWorkOrderDialog
        request={createWOForRequest}
        propertyId={propertyId}
        open={!!createWOForRequest}
        onOpenChange={(open) => { if (!open) setCreateWOForRequest(null); }}
      />
    </div>
  );
}

function CreateWorkOrderDialog({ request, propertyId, open, onOpenChange }: { request: any; propertyId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const createWO = useCreateWorkOrder();
  const { data: maintUsers } = useMaintenanceUsers();
  const [severity, setSeverity] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");

  if (!request) return null;

  const handleCreate = async () => {
    await createWO.mutateAsync({
      maintenance_request_id: request.id,
      property_id: propertyId,
      severity,
      assigned_to: assignedTo || undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
    setSeverity("medium");
    setAssignedTo("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Work Order from Issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium">{request.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{request.description}</p>
          </div>
          <div>
            <Label className="text-sm">Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Assign To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select worker (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {maintUsers?.map((u: any) => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." className="mt-1 h-20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createWO.isPending} className="gap-2">
            {createWO.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Work Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
