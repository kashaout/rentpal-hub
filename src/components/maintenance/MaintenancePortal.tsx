import { useState } from "react";
import { format } from "date-fns";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Building2,
  MapPin,
  Camera,
  FileText,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useMaintenanceRequests,
  useUpdateMaintenanceRequest,
  MaintenanceRequestWithDetails,
} from "@/hooks/useMaintenanceRequests";
import { MaintenanceUpdateDialog } from "./MaintenanceUpdateDialog";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-accent/10 text-accent border-accent/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  in_progress: AlertCircle,
  completed: CheckCircle2,
  cancelled: AlertTriangle,
};

const priorityStyles: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/10 text-primary",
  high: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

export function MaintenancePortal() {
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestWithDetails | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const { data: requests, isLoading } = useMaintenanceRequests();
  const updateRequest = useUpdateMaintenanceRequest();

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const inProgressRequests = requests?.filter((r) => r.status === "in_progress") || [];
  const completedRequests = requests?.filter((r) => r.status === "completed") || [];

  const handleQuickStatusChange = async (
    request: MaintenanceRequestWithDetails,
    newStatus: "pending" | "in_progress" | "completed" | "cancelled"
  ) => {
    const updates: { id: string; status: typeof newStatus; resolved_at?: string | null } = {
      id: request.id,
      status: newStatus,
    };

    if (newStatus === "completed") {
      updates.resolved_at = new Date().toISOString();
    } else {
      updates.resolved_at = null;
    }

    await updateRequest.mutateAsync(updates);
  };

  const handleOpenUpdate = (request: MaintenanceRequestWithDetails) => {
    setSelectedRequest(request);
    setUpdateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading maintenance requests...</p>
        </div>
      </div>
    );
  }

  const renderRequestCard = (request: MaintenanceRequestWithDetails) => {
    const StatusIcon = statusIcons[request.status];

    return (
      <Card key={request.id} className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold">{request.title}</h4>
                <Badge
                  variant="outline"
                  className={cn("capitalize text-xs", priorityStyles[request.priority])}
                >
                  {request.priority}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {request.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {request.property_name}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {request.property_address}
                </span>
                {request.assigned_user_name && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {request.assigned_user_name}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Submitted {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>

              {request.repair_notes && (
                <div className="mt-2 rounded-md bg-muted/50 p-2">
                  <p className="text-xs font-medium flex items-center gap-1 mb-1">
                    <FileText className="h-3 w-3" />
                    Repair Notes
                  </p>
                  <p className="text-xs text-muted-foreground">{request.repair_notes}</p>
                </div>
              )}

              {request.photo_urls && request.photo_urls.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {request.photo_urls.slice(0, 4).map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative h-12 w-12 overflow-hidden rounded-md border"
                    >
                      <img
                        src={url}
                        alt={`Repair photo ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ))}
                  {request.photo_urls.length > 4 && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                      +{request.photo_urls.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge
                variant="outline"
                className={cn("capitalize flex items-center gap-1", statusStyles[request.status])}
              >
                <StatusIcon className="h-3 w-3" />
                {request.status.replace("_", " ")}
              </Badge>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {request.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickStatusChange(request, "in_progress")}
                    disabled={updateRequest.isPending}
                  >
                    Start
                  </Button>
                )}
                {request.status === "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenUpdate(request)}
                    className="gap-1"
                  >
                    <Camera className="h-3 w-3" />
                    Complete
                  </Button>
                )}
                {request.status !== "completed" && request.status !== "cancelled" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenUpdate(request)}
                  >
                    Update
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Requests
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-warning">{pendingRequests.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{inProgressRequests.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Today
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">
              {completedRequests.filter(
                (r) =>
                  r.resolved_at &&
                  new Date(r.resolved_at).toDateString() === new Date().toDateString()
              ).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-2">
                Pending
                <Badge variant="secondary" className="ml-1">
                  {pendingRequests.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="gap-2">
                In Progress
                <Badge variant="secondary" className="ml-1">
                  {inProgressRequests.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                Completed
                <Badge variant="secondary" className="ml-1">
                  {completedRequests.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3">
              {pendingRequests.length > 0 ? (
                pendingRequests.map(renderRequestCard)
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-success/50" />
                  <p className="mt-2">No pending requests! You're all caught up.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-3">
              {inProgressRequests.length > 0 ? (
                inProgressRequests.map(renderRequestCard)
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2">No requests in progress.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3">
              {completedRequests.length > 0 ? (
                completedRequests.map(renderRequestCard)
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Wrench className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2">No completed requests yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedRequest && (
        <MaintenanceUpdateDialog
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          request={selectedRequest}
        />
      )}
    </div>
  );
}