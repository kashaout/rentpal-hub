import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Pen, CheckCircle2, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useMyLeaseAgreements,
  useSignLeaseAgreement,
  LeaseAgreement,
} from "@/hooks/useLeaseAgreements";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatCurrency";
import { LeaseTemplateViewer } from "@/components/tenant/LeaseTemplateViewer";

export function PendingLeasesPage() {
  const { user } = useAuth();
  const { data: agreements, isLoading } = useMyLeaseAgreements();
  const signLease = useSignLeaseAgreement();
  const [viewing, setViewing] = useState<LeaseAgreement | null>(null);

  if (viewing) {
    // Render the full readable lease in-app before signing.
    return <LeaseTemplateViewer agreement={viewing} onBack={() => setViewing(null)} />;
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const pendingLeases = agreements?.filter((a) => {
    if (a.status === "active") return false;
    if (a.tenant_user_id === user?.id && !a.tenant_signed) return true;
    if (a.landlord_user_id === user?.id && !a.landlord_signed) return true;
    if (a.tenant_user_id === user?.id && a.tenant_signed && !a.landlord_signed) return true;
    if (a.landlord_user_id === user?.id && a.landlord_signed && !a.tenant_signed) return true;
    return false;
  }) || [];

  if (pendingLeases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <CheckCircle2 className="h-12 w-12 text-success/50" />
        <p className="mt-4 text-muted-foreground">No pending lease agreements.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingLeases.map((lease) => {
        const isTenant = lease.tenant_user_id === user?.id;
        const isLandlord = lease.landlord_user_id === user?.id;
        const needsMySignature =
          (isTenant && !lease.tenant_signed) || (isLandlord && !lease.landlord_signed);
        const waitingForOther =
          (isTenant && lease.tenant_signed && !lease.landlord_signed) ||
          (isLandlord && lease.landlord_signed && !lease.tenant_signed);

        return (
          <Card key={lease.id} className="border-l-4 border-l-accent">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Unit {lease.unit_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(lease.lease_start), "MMM d, yyyy")} –{" "}
                    {format(new Date(lease.lease_end), "MMM d, yyyy")}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    needsMySignature
                      ? "bg-warning/10 text-warning"
                      : waitingForOther
                      ? "bg-accent/10 text-accent"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {needsMySignature
                    ? "Needs Your Signature"
                    : waitingForOther
                    ? `Pending ${isTenant ? "Landlord" : "Tenant"} Signature`
                    : "Awaiting Counter-Signature"}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Rent: {formatCurrency(Number(lease.rent_amount), lease.currency)}
                </span>
                <span className="text-muted-foreground text-xs">
                  Tenant: {lease.tenant_signed ? "✓" : "✗"} / Landlord:{" "}
                  {lease.landlord_signed ? "✓" : "✗"}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {/* "Open Lease" — landlord/tenant can read full lease before signing */}
                <Button variant="outline" onClick={() => setViewing(lease)} className="gap-2">
                  <Eye className="h-4 w-4" />
                  Open Lease
                </Button>

                {needsMySignature ? (
                  <Button
                    onClick={() =>
                      signLease.mutate({
                        agreementId: lease.id,
                        role: isTenant ? "tenant" : "landlord",
                      })
                    }
                    disabled={signLease.isPending}
                    className="gap-2"
                  >
                    {signLease.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pen className="h-4 w-4" />
                    )}
                    Sign Lease
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center self-center">
                    Waiting for {isTenant ? "landlord" : "tenant"} to counter-sign.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
