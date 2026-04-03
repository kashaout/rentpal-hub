import { useState } from "react";
import { format } from "date-fns";
import {
  Scale, AlertTriangle, CheckCircle2, Clock, Loader2,
  FileText, Shield, Banknote, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDisputes, useResolveDispute, Dispute } from "@/hooks/useDisputes";
import { useEscrowTransactions, useEscrowBalance } from "@/hooks/useEscrow";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

const disputeStatusStyles: Record<string, string> = {
  open: "bg-warning/10 text-warning border-warning/20",
  under_review: "bg-accent/10 text-accent border-accent/20",
  resolved: "bg-success/10 text-success border-success/20",
  denied: "bg-destructive/10 text-destructive border-destructive/20",
};

function ResolveDisputeDialog({ dispute, open, onOpenChange }: { dispute: Dispute | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const resolveDispute = useResolveDispute();
  const [resType, setResType] = useState("partial_refund");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  if (!dispute) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Dispute</DialogTitle>
          <DialogDescription>{dispute.description.slice(0, 100)}...</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Resolution Type</Label>
            <Select value={resType} onValueChange={setResType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="partial_refund">Partial Refund</SelectItem>
                <SelectItem value="full_refund">Full Refund</SelectItem>
                <SelectItem value="compensation">Compensation</SelectItem>
                <SelectItem value="denied">Deny Claim</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {resType !== "denied" && (
            <div>
              <Label>Amount</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1" />
            </div>
          )}
          <div>
            <Label>Resolution Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Explain the decision..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              await resolveDispute.mutateAsync({
                disputeId: dispute.id,
                resolution_type: resType,
                resolution_amount: Number(amount) || 0,
                resolution_notes: notes,
              });
              onOpenChange(false);
            }}
            disabled={resolveDispute.isPending}
          >
            {resolveDispute.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EscrowDisputesDashboard() {
  const { isAdmin } = useAuth();
  const { data: escrowTxns = [], isLoading: loadingEscrow } = useEscrowTransactions();
  const { data: balance } = useEscrowBalance();
  const { data: disputes = [], isLoading: loadingDisputes } = useDisputes();
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);

  if (loadingEscrow || loadingDisputes) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Escrow Balance Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Escrow Held</CardTitle>
            <Banknote className="h-4 w-4 text-primary absolute right-4 top-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(balance?.held || 0, balance?.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Released</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success absolute right-4 top-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(balance?.released || 0, balance?.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Refunded</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning absolute right-4 top-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{formatCurrency(balance?.refunded || 0, balance?.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
            <Scale className="h-4 w-4 text-accent absolute right-4 top-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">{formatCurrency(balance?.balance || 0, balance?.currency)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Disputes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Disputes
          </CardTitle>
          <CardDescription>Manage disputes and payout freezes</CardDescription>
        </CardHeader>
        <CardContent>
          {disputes.length > 0 ? (
            <div className="space-y-3">
              {disputes.map((d) => (
                <div key={d.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{d.dispute_type.replace("_", " ")} dispute</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.payout_frozen && (
                        <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">Payout Frozen</Badge>
                      )}
                      <Badge variant="outline" className={cn("capitalize text-xs", disputeStatusStyles[d.status])}>
                        {d.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Filed {format(new Date(d.created_at), "MMM d, yyyy")}
                      {d.resolution_amount > 0 && ` • Resolution: ${formatCurrency(d.resolution_amount)}`}
                    </span>
                    {isAdmin && d.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedDispute(d); setResolveOpen(true); }}>
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Shield className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2">No disputes filed.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Escrow Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Escrow Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {escrowTxns.length > 0 ? (
            <div className="space-y-2">
              {escrowTxns.slice(0, 20).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center",
                      t.transaction_type === "capture" ? "bg-primary/10" :
                      t.transaction_type === "release" ? "bg-success/10" :
                      "bg-warning/10"
                    )}>
                      <Banknote className={cn("h-4 w-4",
                        t.transaction_type === "capture" ? "text-primary" :
                        t.transaction_type === "release" ? "text-success" :
                        "text-warning"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{t.transaction_type}</p>
                      <p className="text-xs text-muted-foreground">{t.description || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold",
                      t.transaction_type === "refund" ? "text-warning" :
                      t.transaction_type === "release" ? "text-success" :
                      "text-foreground"
                    )}>
                      {t.transaction_type === "capture" ? "+" : "-"}{formatCurrency(t.amount, t.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "MMM d")}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <DollarSign className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2">No escrow transactions yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ResolveDisputeDialog dispute={selectedDispute} open={resolveOpen} onOpenChange={setResolveOpen} />
    </div>
  );
}
