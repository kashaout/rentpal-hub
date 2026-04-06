import { useMemo } from "react";
import { format } from "date-fns";
import { Loader2, AlertTriangle, Clock, Wrench, CheckCircle2, Eye, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkOrders, useUpdateWorkOrderStatus, WorkOrder, WorkOrderStatus } from "@/hooks/useWorkOrders";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { cn } from "@/lib/utils";

type KanbanColumn = {
  key: string;
  label: string;
  icon: React.ElementType;
  statuses: string[]; // work_order statuses or maintenance_request statuses that map here
  color: string;
};

const COLUMNS: KanbanColumn[] = [
  { key: "new", label: "New", icon: AlertTriangle, statuses: ["created", "pending"], color: "bg-warning/10 border-warning/30" },
  { key: "assigned", label: "Assigned", icon: Clock, statuses: ["assigned", "accepted", "en_route", "on_site"], color: "bg-primary/10 border-primary/30" },
  { key: "in_progress", label: "In Progress", icon: Wrench, statuses: ["in_progress"], color: "bg-accent/10 border-accent/30" },
  { key: "completed", label: "Completed", icon: CheckCircle2, statuses: ["completed"], color: "bg-success/10 border-success/30" },
  { key: "review", label: "Awaiting Review", icon: Eye, statuses: ["verified"], color: "bg-secondary border-secondary" },
  { key: "closed", label: "Closed", icon: XCircle, statuses: ["closed", "cancelled", "resolved"], color: "bg-muted border-muted" },
];

interface KanbanCard {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  severity?: string;
  propertyName: string;
  createdAt: string;
  type: "request" | "work_order";
  workOrderId?: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  urgent: "bg-destructive text-destructive-foreground",
  emergency: "bg-destructive text-destructive-foreground",
};

const severityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  emergency: "bg-destructive text-destructive-foreground",
};

export function MaintenanceKanbanBoard() {
  const { data: workOrders, isLoading: woLoading } = useWorkOrders();
  const { data: requests, isLoading: reqLoading } = useMaintenanceRequests();
  const updateStatus = useUpdateWorkOrderStatus();

  const isLoading = woLoading || reqLoading;

  // Build unified kanban cards
  const cards = useMemo(() => {
    const result: KanbanCard[] = [];

    // Work orders take priority — track which request IDs have work orders
    const requestsWithWO = new Set<string>();

    (workOrders || []).forEach((wo) => {
      requestsWithWO.add(wo.maintenance_request_id);
      result.push({
        id: wo.id,
        title: wo.request_title || "Work Order",
        description: wo.request_description || wo.notes || "",
        priority: wo.severity || "medium",
        status: wo.status,
        severity: wo.severity,
        propertyName: wo.property_name || "Unknown",
        createdAt: wo.created_at,
        type: "work_order",
        workOrderId: wo.id,
      });
    });

    // Add maintenance requests that don't have work orders yet
    (requests || []).forEach((req) => {
      if (requestsWithWO.has(req.id)) return;
      result.push({
        id: req.id,
        title: req.title,
        description: req.description,
        priority: req.priority,
        status: req.status,
        propertyName: req.property_name || "Unknown",
        createdAt: req.created_at,
        type: "request",
      });
    });

    return result;
  }, [workOrders, requests]);

  // Group cards into columns
  const columnCards = useMemo(() => {
    const groups: Record<string, KanbanCard[]> = {};
    COLUMNS.forEach((col) => (groups[col.key] = []));

    cards.forEach((card) => {
      const col = COLUMNS.find((c) => c.statuses.includes(card.status));
      if (col) {
        groups[col.key].push(card);
      } else {
        // Default to "new" if status doesn't match any column
        groups["new"].push(card);
      }
    });

    return groups;
  }, [cards]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex gap-2 flex-wrap">
        {COLUMNS.map((col) => (
          <Badge key={col.key} variant="outline" className="text-xs">
            {col.label}: {columnCards[col.key]?.length || 0}
          </Badge>
        ))}
        <Badge variant="secondary" className="text-xs ml-auto">
          Total: {cards.length}
        </Badge>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          const colCards = columnCards[col.key] || [];
          return (
            <div key={col.key} className={cn("rounded-xl border-2 p-3 min-h-[300px]", col.color)}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4" />
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary" className="h-5 min-w-5 flex items-center justify-center text-xs ml-auto">
                  {colCards.length}
                </Badge>
              </div>
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2 pr-2">
                  {colCards.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No items</p>
                  ) : (
                    colCards.map((card) => (
                      <KanbanCardItem key={card.id} card={card} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCardItem({ card }: { card: KanbanCard }) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow cursor-default">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium leading-tight line-clamp-2">{card.title}</p>
          <Badge
            variant="outline"
            className={cn("text-[10px] shrink-0 capitalize", card.severity ? severityColors[card.severity] || priorityColors[card.priority] : priorityColors[card.priority])}
          >
            {card.severity || card.priority}
          </Badge>
        </div>
        {card.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>
        )}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="truncate max-w-[100px]">{card.propertyName}</span>
          <span>{format(new Date(card.createdAt), "MMM d")}</span>
        </div>
        {card.type === "work_order" && (
          <Badge variant="outline" className="text-[10px] bg-primary/5">WO</Badge>
        )}
      </CardContent>
    </Card>
  );
}
