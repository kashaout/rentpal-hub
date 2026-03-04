import { useState } from "react";
import { format } from "date-fns";
import { FileText, CheckCircle2, Clock, Pen, Loader2, AlertTriangle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMyLeaseAgreements, useSignLeaseAgreement, LeaseAgreement } from "@/hooks/useLeaseAgreements";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { LeaseTemplateViewer } from "./LeaseTemplateViewer";

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_signature: "bg-warning/10 text-warning border-warning/20",
  active: "bg-success/10 text-success border-success/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
};

function AgreementCard({ agreement, onViewContract }: { agreement: LeaseAgreement; onViewContract: () => void }) {
  const { user, isTenant, isLandlord } = useAuth();
  const signAgreement = useSignLeaseAgreement();

  const isTenantParty = agreement.tenant_user_id === user?.id;
  const isLandlordParty = agreement.landlord_user_id === user?.id;

  const canSign =
    (isTenant && isTenantParty && !agreement.tenant_signed) ||
    (isLandlord && isLandlordParty && !agreement.landlord_signed);

  const role = isTenantParty ? "tenant" : "landlord";

  const needsCounterSign = isLandlord && isLandlordParty && agreement.tenant_signed && !agreement.landlord_signed;

  return (
    <Card className={cn("border", needsCounterSign && "border-warning ring-1 ring-warning/20")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Tenancy Agreement — Unit {agreement.unit_number}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(agreement.lease_start), "MMM d, yyyy")} – {format(new Date(agreement.lease_end), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {needsCounterSign && (
              <Badge className="bg-warning text-warning-foreground">
                Action Required
              </Badge>
            )}
            <Badge variant="outline" className={cn("capitalize", statusStyles[agreement.status])}>
              {agreement.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Tenant</p>
            <p className="font-medium text-foreground">{agreement.tenant_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Landlord</p>
            <p className="font-medium text-foreground">{agreement.landlord_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Rent Amount</p>
            <p className="font-medium text-foreground">{formatCurrency(agreement.rent_amount, agreement.currency)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium text-foreground capitalize">{agreement.status.replace("_", " ")}</p>
          </div>
        </div>

        <Separator />

        {/* View Contract Link */}
        <Button
          variant="outline"
          onClick={onViewContract}
          className="w-full gap-2 border-accent/30 text-accent hover:bg-accent/10"
        >
          <Eye className="h-4 w-4" />
          View Full Contract & Sign
        </Button>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            {agreement.landlord_signed ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={agreement.landlord_signed ? "text-success" : "text-muted-foreground"}>
              Landlord {agreement.landlord_signed ? "Signed" : "Pending"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {agreement.tenant_signed ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={agreement.tenant_signed ? "text-success" : "text-muted-foreground"}>
              Tenant {agreement.tenant_signed ? "Signed" : "Pending"}
            </span>
          </div>
        </div>

        {needsCounterSign && (
          <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs text-warning">
              The tenant ({agreement.tenant_name}) has signed this agreement. Please review the contract and counter-sign to activate the lease.
            </p>
          </div>
        )}

        {canSign && (
          <Button
            onClick={() => signAgreement.mutate({ agreementId: agreement.id, role })}
            disabled={signAgreement.isPending}
            className={cn(
              "w-full gap-2",
              needsCounterSign
                ? "bg-warning text-warning-foreground hover:bg-warning/90"
                : "bg-gradient-warm text-accent-foreground hover:opacity-90"
            )}
          >
            {signAgreement.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pen className="h-4 w-4" />
            )}
            {needsCounterSign ? "Counter-Sign Agreement" : "Sign Agreement"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function LeaseAgreementView() {
  const { data: agreements, isLoading } = useMyLeaseAgreements();
  const [viewingAgreement, setViewingAgreement] = useState<LeaseAgreement | null>(null);

  if (viewingAgreement) {
    return (
      <LeaseTemplateViewer
        agreement={viewingAgreement}
        onBack={() => setViewingAgreement(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[30vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!agreements || agreements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">No lease agreements yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <h2 className="font-display text-xl font-semibold text-foreground">Tenancy Agreements</h2>
      <p className="text-sm text-muted-foreground">Review, view the full contract, and sign your tenancy agreements.</p>
      <div className="space-y-4">
        {agreements.map((agreement) => (
          <AgreementCard
            key={agreement.id}
            agreement={agreement}
            onViewContract={() => setViewingAgreement(agreement)}
          />
        ))}
      </div>
    </div>
  );
}
