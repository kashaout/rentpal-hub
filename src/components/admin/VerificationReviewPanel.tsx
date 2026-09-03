import { useState, useMemo } from "react";
import { Check, X, Eye, Loader2, User, Building2, Clock, FileText, AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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

/** submitted_data is Json in the database — narrow before reading fields. */
function submittedField(data: unknown, key: "address" | "full_name"): string | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value.toLowerCase().trim() || undefined : undefined;
}

function RiskFlagsSection({ request, allRequests }: { request: VerificationRequest; allRequests: VerificationRequest[] }) {
  const flags: { label: string; severity: "warn" | "error"; detail: string }[] = [];

  // 1. Multiple verification attempts by this user
  const userRequests = allRequests.filter((r) => r.user_id === request.user_id);
  if (userRequests.length > 1) {
    flags.push({
      label: "Multiple Attempts",
      severity: "warn",
      detail: `This user has ${userRequests.length} verification requests (including rejected/previous).`,
    });
  }

  // 2. Duplicate address across accounts
  const submittedAddress = submittedField(request.submitted_data, "address");
  if (submittedAddress) {
    const duplicateAddressUsers = allRequests.filter(
      (r) =>
        r.user_id !== request.user_id &&
        submittedField(r.submitted_data, "address") === submittedAddress
    );
    if (duplicateAddressUsers.length > 0) {
      flags.push({
        label: "Duplicate Address",
        severity: "error",
        detail: `Address "${submittedAddress}" appears in ${duplicateAddressUsers.length} other account(s).`,
      });
    }
  }

  // 3. Name mismatch between profile name and submitted name
  const submittedName = submittedField(request.submitted_data, "full_name");
  // We compare against the user_id — in a full implementation you'd fetch the profile name,
  // but we can flag if the submitted name changed between attempts
  const otherNames = userRequests
    .filter((r) => r.id !== request.id)
    .map((r) => submittedField(r.submitted_data, "full_name"))
    .filter(Boolean);
  if (otherNames.length > 0 && submittedName) {
    const hasMismatch = otherNames.some((n) => n !== submittedName);
    if (hasMismatch) {
      flags.push({
        label: "Name Mismatch",
        severity: "error",
        detail: `Name "${submittedName}" differs from previous submissions: ${[...new Set(otherNames)].join(", ")}`,
      });
    }
  }

  if (flags.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="font-medium text-sm flex items-center gap-1.5">
        <ShieldAlert className="h-4 w-4 text-destructive" /> Risk Flags
      </p>
      <div className="space-y-1.5">
        {flags.map((flag, i) => (
          <div
            key={i}
            className={`rounded-md border p-2 text-xs ${
              flag.severity === "error"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400"
            }`}
          >
            <div className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3 w-3" />
              {flag.label}
            </div>
            <p className="mt-0.5 opacity-80">{flag.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
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
                    <p className="font-medium text-sm">{submittedField(req.submitted_data, "full_name") || "Unknown"}</p>
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

              {/* Risk Flags */}
              <RiskFlagsSection request={selectedRequest} allRequests={requests || []} />

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
