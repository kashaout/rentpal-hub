import { useState } from "react";
import { Check, X, Eye, Loader2, User, Building2, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useAllVerificationRequests, useApproveVerification, VerificationRequest } from "@/hooks/useVerification";
import { toast } from "sonner";
import { format } from "date-fns";

export function VerificationReviewPanel() {
  const { data: requests, isLoading } = useAllVerificationRequests();
  const approveVerification = useApproveVerification();
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filter, setFilter] = useState<string>("pending");

  const filtered = requests?.filter((r) => filter === "all" || r.status === filter) || [];

  const handleAction = async (approved: boolean) => {
    if (!selectedRequest) return;
    try {
      await approveVerification.mutateAsync({
        requestId: selectedRequest.id,
        approved,
        notes: adminNotes,
      });
      toast.success(approved ? "Verification approved!" : "Verification rejected.");
      setSelectedRequest(null);
      setAdminNotes("");
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  const typeLabel = (t: string) => {
    switch (t) {
      case "landlord": return "Landlord";
      case "tenant_short_term": return "Tenant (Short-Term)";
      case "tenant_long_term": return "Tenant (Long-Term)";
      default: return t;
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "pending": return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case "approved": return <Badge className="bg-green-500/10 text-green-600 gap-1"><Check className="h-3 w-3" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" />Rejected</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {["pending", "approved", "rejected", "all"].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No verification requests" description={`No ${filter === "all" ? "" : filter} verification requests found.`} />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Card key={req.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => { setSelectedRequest(req); setAdminNotes(req.admin_notes || ""); }}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {req.verification_type === "landlord" ? (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{(req.submitted_data as any)?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{typeLabel(req.verification_type)} · {format(new Date(req.created_at), "MMM d, yyyy")}</p>
                  </div>
                </div>
                {statusBadge(req.status)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium">{typeLabel(selectedRequest.verification_type)}</span>
                {statusBadge(selectedRequest.status)}
              </div>

              <div className="rounded-lg border p-3 space-y-1.5">
                {Object.entries(selectedRequest.submitted_data as Record<string, any>).map(([key, val]) =>
                  val ? (
                    <p key={key}>
                      <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span> {String(val)}
                    </p>
                  ) : null
                )}
              </div>

              {selectedRequest.document_paths?.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Documents ({selectedRequest.document_paths.length})</p>
                  {selectedRequest.document_paths.map((p, i) => (
                    <Badge key={i} variant="outline" className="mr-1 mb-1 text-xs">{p.split("/").pop()}</Badge>
                  ))}
                </div>
              )}

              {(selectedRequest.status === "pending" || selectedRequest.status === "additional_info_needed") && (
                <>
                  <div className="space-y-2">
                    <p className="font-medium">Admin Notes</p>
                    <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Optional notes..." rows={3} />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="destructive" onClick={() => handleAction(false)} disabled={approveVerification.isPending} className="gap-1">
                      <X className="h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => handleAction(true)} disabled={approveVerification.isPending} className="gap-1">
                      {approveVerification.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Approve
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
