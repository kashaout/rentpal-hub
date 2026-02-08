import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Plus, 
  Bell, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Settings,
} from "lucide-react";
import { 
  useAutomationWorkflows, 
  useUpdateWorkflow, 
  useDeleteWorkflow,
  useWorkflowAlerts,
  useMarkAlertRead,
  useDismissAlert,
  WORKFLOW_TEMPLATES,
  WorkflowType,
} from "@/hooks/useAutomationWorkflows";
import { useHasFeature } from "@/hooks/useSubscription";
import { WorkflowFormDialog } from "./WorkflowFormDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function AutomationDashboard() {
  const { hasFeature, plan } = useHasFeature("automation_workflows");
  const { data: workflows = [], isLoading } = useAutomationWorkflows();
  const { data: alerts = [] } = useWorkflowAlerts();
  const updateWorkflow = useUpdateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const markRead = useMarkAlertRead();
  const dismissAlert = useDismissAlert();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<string | null>(null);

  if (!hasFeature) {
    return (
      <div className="p-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Automation Workflows</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Automate notifications for overdue rent, expiring leases, and more. 
              Upgrade to Pro or Business plan to unlock this feature.
            </p>
            <Badge variant="secondary">Current plan: {plan}</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggleWorkflow = (id: string, enabled: boolean) => {
    updateWorkflow.mutate({ id, is_enabled: enabled });
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automation Workflows</h2>
          <p className="text-muted-foreground">Automate notifications and actions for your properties</p>
        </div>
        <Button onClick={() => { setEditingWorkflow(null); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <Tabs defaultValue="workflows">
        <TabsList>
          <TabsTrigger value="workflows" className="gap-2">
            <Zap className="h-4 w-4" />
            Workflows ({workflows.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            Alerts
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-24 bg-muted rounded-t-lg" />
                  <CardContent className="h-20" />
                </Card>
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Create your first automation workflow to start receiving smart alerts.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workflows.map((workflow) => {
                const template = WORKFLOW_TEMPLATES[workflow.workflow_type as WorkflowType];
                return (
                  <Card key={workflow.id} className={cn(!workflow.is_enabled && "opacity-60")}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{template?.icon}</span>
                          <div>
                            <CardTitle className="text-base">{workflow.name}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {workflow.description || template?.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Switch
                          checked={workflow.is_enabled}
                          onCheckedChange={(checked) => handleToggleWorkflow(workflow.id, checked)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Clock className="h-3 w-3" />
                        {workflow.last_triggered_at 
                          ? `Last triggered ${formatDistanceToNow(new Date(workflow.last_triggered_at))} ago`
                          : "Never triggered"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => { setEditingWorkflow(workflow.id); setIsDialogOpen(true); }}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Configure
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this workflow and all its settings.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteWorkflow.mutate(workflow.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          {alerts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-success mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground text-center">
                  No active alerts. Your workflows will generate alerts when conditions are met.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card 
                  key={alert.id} 
                  className={cn(
                    "cursor-pointer transition-colors",
                    !alert.is_read && "border-l-4 border-l-warning bg-warning/5"
                  )}
                  onClick={() => !alert.is_read && markRead.mutate(alert.id)}
                >
                  <CardContent className="flex items-start gap-4 py-4">
                    <div className={cn(
                      "p-2 rounded-full",
                      alert.severity === "critical" && "bg-destructive/10 text-destructive",
                      alert.severity === "warning" && "bg-warning/10 text-warning",
                      alert.severity === "info" && "bg-accent/10 text-accent"
                    )}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                          {alert.severity}
                        </Badge>
                        {!alert.is_read && <Badge variant="outline">New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(alert.triggered_at))} ago
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); dismissAlert.mutate(alert.id); }}
                    >
                      Dismiss
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <WorkflowFormDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        workflowId={editingWorkflow}
      />
    </div>
  );
}
