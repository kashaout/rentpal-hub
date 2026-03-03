import { useState, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Building2,
  User,
  Filter,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useMaintenanceRequests,
  useUpdateMaintenanceRequest,
  MaintenanceRequestWithDetails,
} from "@/hooks/useMaintenanceRequests";
import { useLandlordTenantRequests, useRespondToRequest, TenantRequest } from "@/hooks/useTenantRequests";
import { useMaintenanceUsers } from "@/hooks/useMaintenanceUsers";
import { useProperties } from "@/hooks/useProperties";
import { MaintenanceUpdateDialog } from "./maintenance/MaintenanceUpdateDialog";
import { cn } from "@/lib/utils";

// Unified issue type combining both tables
interface UnifiedIssue extends MaintenanceRequestWithDetails {
  source: "maintenance" | "tenant_request";
  category?: string;
  landlord_response?: string | null;
}

const statusConfig = {
  pending: { 
    label: "Pending", 
    color: "bg-warning/10 text-warning border-warning/20",
    icon: Clock,
    progress: 0 
  },
  in_progress: { 
    label: "In Progress", 
    color: "bg-accent/10 text-accent border-accent/20",
    icon: AlertCircle,
    progress: 50 
  },
  completed: { 
    label: "Completed", 
    color: "bg-success/10 text-success border-success/20",
    icon: CheckCircle2,
    progress: 100 
  },
  cancelled: { 
    label: "Cancelled", 
    color: "bg-muted text-muted-foreground border-muted",
    icon: AlertTriangle,
    progress: 0 
  },
};

const priorityConfig = {
  low: { label: "Low", color: "bg-muted text-muted-foreground", weight: 1 },
  medium: { label: "Medium", color: "bg-primary/10 text-primary", weight: 2 },
  high: { label: "High", color: "bg-warning/10 text-warning", weight: 3 },
  urgent: { label: "Urgent", color: "bg-destructive/10 text-destructive", weight: 4 },
};

type SortField = "created_at" | "priority" | "status" | "property";
type SortDirection = "asc" | "desc";

export function IssueReportingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestWithDetails | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const { data: requests, isLoading: loadingRequests } = useMaintenanceRequests();
  const { data: tenantRequests, isLoading: loadingTenantRequests } = useLandlordTenantRequests();
  const { data: maintenanceUsers, isLoading: loadingUsers } = useMaintenanceUsers();
  const { data: properties } = useProperties();
  const updateRequest = useUpdateMaintenanceRequest();

  // Merge maintenance_requests and tenant_requests into unified list
  const allIssues: UnifiedIssue[] = useMemo(() => {
    const maintenanceIssues: UnifiedIssue[] = (requests || []).map((r) => ({
      ...r,
      source: "maintenance" as const,
    }));

    // Map tenant_requests to the unified shape
    const propertyMap = new Map(properties?.map((p) => [p.id, p]) || []);
    const tenantIssues: UnifiedIssue[] = (tenantRequests || []).map((tr) => {
      const prop = propertyMap.get(tr.property_id);
      return {
        id: tr.id,
        source: "tenant_request" as const,
        tenant_id: tr.tenant_user_id,
        property_id: tr.property_id,
        title: tr.subject,
        description: tr.message,
        priority: tr.priority as any,
        status: tr.status === "open" ? "pending" : tr.status === "responded" ? "completed" : tr.status as any,
        created_at: tr.created_at,
        updated_at: tr.updated_at,
        resolved_at: tr.responded_at,
        assigned_to: null,
        assigned_user_name: null,
        assigned_user_email: null,
        repair_notes: null,
        photo_urls: null,
        rating: null,
        property_name: prop?.name || "Unknown",
        property_address: prop?.address || "",
        category: tr.category,
        landlord_response: tr.landlord_response,
      };
    });

    return [...maintenanceIssues, ...tenantIssues];
  }, [requests, tenantRequests, properties]);

  // Compute stats
  const stats = useMemo(() => {
    if (allIssues.length === 0) return { total: 0, pending: 0, inProgress: 0, completed: 0, avgResolutionTime: 0, tenantRequests: 0 };
    
    const completed = allIssues.filter(r => r.status === "completed");
    const avgTime = completed.length > 0
      ? completed.reduce((acc, r) => {
          if (r.resolved_at) {
            const created = new Date(r.created_at).getTime();
            const resolved = new Date(r.resolved_at).getTime();
            return acc + (resolved - created);
          }
          return acc;
        }, 0) / completed.length / (1000 * 60 * 60 * 24)
      : 0;

    return {
      total: allIssues.length,
      pending: allIssues.filter(r => r.status === "pending").length,
      inProgress: allIssues.filter(r => r.status === "in_progress").length,
      completed: completed.length,
      avgResolutionTime: Math.round(avgTime * 10) / 10,
      tenantRequests: allIssues.filter(r => r.source === "tenant_request").length,
    };
  }, [allIssues]);

  // Filter and sort
  const filteredRequests = useMemo(() => {
    let filtered = allIssues.filter(r => {
      const matchesSearch = 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.property_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter;
      const matchesProperty = propertyFilter === "all" || r.property_id === propertyFilter;
      const matchesSource = sourceFilter === "all" || r.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesProperty && matchesSource;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "priority":
          comparison = priorityConfig[a.priority as keyof typeof priorityConfig].weight - 
                       priorityConfig[b.priority as keyof typeof priorityConfig].weight;
          break;
        case "status":
          comparison = statusConfig[a.status as keyof typeof statusConfig].progress - 
                       statusConfig[b.status as keyof typeof statusConfig].progress;
          break;
        case "property":
          comparison = a.property_name.localeCompare(b.property_name);
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return filtered;
  }, [allIssues, searchQuery, statusFilter, priorityFilter, propertyFilter, sourceFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleAssign = async (requestId: string, userId: string | null) => {
    await updateRequest.mutateAsync({
      id: requestId,
      assigned_to: userId,
    });
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    await updateRequest.mutateAsync({
      id: requestId,
      status: newStatus as "pending" | "in_progress" | "completed" | "cancelled",
      resolved_at: newStatus === "completed" ? new Date().toISOString() : null,
    });
  };

  const handleOpenUpdate = (request: MaintenanceRequestWithDetails) => {
    setSelectedRequest(request);
    setUpdateDialogOpen(true);
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loadingRequests && loadingTenantRequests) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading issue reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Issues
            </CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-warning">{stats.pending}</p>
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
            <p className="text-3xl font-bold text-accent">{stats.inProgress}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{stats.completed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Resolution
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.avgResolutionTime}d</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overall Completion Rate</CardTitle>
          <CardDescription>
            {stats.completed} of {stats.total} issues resolved
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={completionRate} className="flex-1" />
            <span className="text-sm font-medium">{completionRate}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Issue Reports
          </CardTitle>
          <CardDescription>
            Track and manage all issues and requests raised by tenants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters Row */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties?.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="tenant_request">Tenant Requests</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("property")}
                    >
                      Property
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("priority")}
                    >
                      Priority
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("status")}
                    >
                      Status
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("created_at")}
                    >
                      Reported
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Wrench className="h-8 w-8" />
                        <p>No issues found matching your filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => {
                    const status = statusConfig[request.status as keyof typeof statusConfig];
                    const priority = priorityConfig[request.priority as keyof typeof priorityConfig];
                    const StatusIcon = status.icon;
                    const isExpanded = expandedRow === request.id;

                    return (
                      <Collapsible key={request.id} open={isExpanded} onOpenChange={() => setExpandedRow(isExpanded ? null : request.id)}>
                        <TableRow className="group">
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{request.title}</p>
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", request.source === "tenant_request" ? "bg-accent/10 text-accent border-accent/20" : "bg-primary/10 text-primary border-primary/20")}>
                                  {request.source === "tenant_request" ? (request.category ? request.category.replace("_", " ") : "Request") : "Maintenance"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {request.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{request.property_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("capitalize", priority.color)}>
                              {priority.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("gap-1 h-7", status.color)}>
                                  <StatusIcon className="h-3 w-3" />
                                  {status.label}
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {Object.entries(statusConfig).map(([key, config]) => (
                                  <DropdownMenuItem
                                    key={key}
                                    onClick={() => handleStatusChange(request.id, key)}
                                    className="gap-2"
                                  >
                                    <config.icon className="h-4 w-4" />
                                    {config.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={request.assigned_to || "unassigned"}
                              onValueChange={(value) => handleAssign(request.id, value === "unassigned" ? null : value)}
                            >
                              <SelectTrigger className="w-[160px] h-8">
                                <SelectValue>
                                  {request.assigned_user_name || (
                                    <span className="text-muted-foreground">Unassigned</span>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">
                                  <span className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    Unassigned
                                  </span>
                                </SelectItem>
                                {maintenanceUsers?.map((worker) => (
                                  <SelectItem key={worker.user_id} value={worker.user_id}>
                                    <span className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      {worker.full_name || worker.email}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 w-24">
                              <Progress value={status.progress} className="h-2" />
                              <span className="text-xs text-muted-foreground w-8">
                                {status.progress}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {request.source === "maintenance" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenUpdate(request)}
                              >
                                Update
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Request
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={9} className="p-4">
                              <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Full Description</p>
                                  <p className="text-sm">{request.description}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Property Address</p>
                                  <p className="text-sm">{request.property_address}</p>
                                  
                                  {request.repair_notes && (
                                    <div className="mt-3">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Repair Notes</p>
                                      <p className="text-sm">{request.repair_notes}</p>
                                    </div>
                                  )}
                                  {request.landlord_response && (
                                    <div className="mt-3">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Landlord Response</p>
                                      <p className="text-sm">{request.landlord_response}</p>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Timeline</p>
                                  <div className="space-y-1 text-sm">
                                    <p>Created: {format(new Date(request.created_at), "PPp")}</p>
                                    <p>Updated: {format(new Date(request.updated_at), "PPp")}</p>
                                    {request.resolved_at && (
                                      <p className="text-success">Resolved: {format(new Date(request.resolved_at), "PPp")}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Showing {filteredRequests.length} of {allIssues.length} issues</p>
          </div>
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
