import { useState } from "react";
import { format } from "date-fns";
import { MessageSquare, Plus, Send, Loader2, Clock, CheckCircle2, AlertCircle, Wrench, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyTenantRequests, useCreateTenantRequest } from "@/hooks/useTenantRequests";
import { useMaintenanceRequests, useCreateMaintenanceRequest } from "@/hooks/useMaintenanceRequests";
import { useTenantLease } from "@/hooks/useTenantPortal";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  open: "bg-accent/10 text-accent border-accent/20",
  responded: "bg-success/10 text-success border-success/20",
  closed: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-accent/10 text-accent border-accent/20",
  completed: "bg-success/10 text-success border-success/20",
};

const categoryIcons: Record<string, any> = {
  general: HelpCircle,
  complaint: AlertCircle,
  lease_question: MessageSquare,
  maintenance: Wrench,
};

function NewRequestDialog({ propertyId, tenantId }: { propertyId: string; tenantId?: string }) {
  const { user } = useAuth();
  const createRequest = useCreateTenantRequest();
  const createMaintenanceRequest = useCreateMaintenanceRequest();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || !user) return;

    if (category === "maintenance" && tenantId) {
      // Create as a maintenance_request so it shows on the issues screen
      await createMaintenanceRequest.mutateAsync({
        tenant_id: tenantId,
        property_id: propertyId,
        title: subject.trim(),
        description: message.trim(),
        priority: priority as any,
      });
    } else {
      await createRequest.mutateAsync({
        tenant_user_id: user.id,
        property_id: propertyId,
        category,
        subject: subject.trim(),
        message: message.trim(),
        priority,
      });
    }

    setSubject("");
    setMessage("");
    setCategory("general");
    setPriority("medium");
    setOpen(false);
  };

  const isPending = createRequest.isPending || createMaintenanceRequest.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit a Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="lease_question">Lease Question</SelectItem>
                  <SelectItem value="maintenance">Maintenance Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief subject..." className="mt-1" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your request in detail..." className="mt-1 h-28" />
          </div>
          <Button onClick={handleSubmit} disabled={!subject.trim() || !message.trim() || isPending} className="w-full gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TenantRequestsInbox() {
  const { data: lease } = useTenantLease();
  const { data: requests, isLoading: requestsLoading } = useMyTenantRequests();
  const { data: maintenanceRequests, isLoading: maintenanceLoading } = useMaintenanceRequests(lease?.id);
  const [tab, setTab] = useState("all");

  const isLoading = requestsLoading || maintenanceLoading;

  // Combine general requests and maintenance requests into unified view
  const allItems = [
    ...(requests || []).map((r) => ({
      id: r.id,
      type: "request" as const,
      subject: r.subject,
      message: r.message,
      status: r.status,
      category: r.category,
      priority: r.priority,
      response: r.landlord_response,
      created_at: r.created_at,
    })),
    ...(maintenanceRequests || []).map((m) => ({
      id: m.id,
      type: "maintenance" as const,
      subject: m.title,
      message: m.description,
      status: m.status,
      category: "maintenance",
      priority: m.priority,
      response: m.repair_notes,
      created_at: m.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredItems = tab === "all" ? allItems : allItems.filter((i) => {
    if (tab === "maintenance") return i.type === "maintenance";
    if (tab === "requests") return i.type === "request";
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex h-[30vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Inbox</h2>
          <p className="text-sm text-muted-foreground">All your requests and maintenance issues in one place</p>
        </div>
        {lease && <NewRequestDialog propertyId={lease.property_id} tenantId={lease.id} />}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({allItems.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests?.length || 0})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance ({maintenanceRequests?.length || 0})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const Icon = categoryIcons[item.category] || HelpCircle;
            return (
              <Card key={item.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                      <div className="rounded-lg bg-secondary p-2 shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-foreground text-sm">{item.subject}</h4>
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.type === "maintenance" ? "Maintenance" : item.category.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                        {item.response && (
                          <div className="mt-2 rounded-md bg-success/5 border border-success/10 p-2">
                            <p className="text-xs font-medium text-success">Response:</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.response}</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={cn("capitalize text-xs", statusStyles[item.status])}>
                        {item.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.priority}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">No requests or issues yet.</p>
        </div>
      )}
    </div>
  );
}
