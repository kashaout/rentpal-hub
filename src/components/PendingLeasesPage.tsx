import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Pen, CheckCircle2, Eye, Clock, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useMyLeaseAgreements,
  useSignLeaseAgreement,
  LeaseAgreement,
} from "@/hooks/useLeaseAgreements";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatCurrency";
import { LeaseTemplateViewer } from "@/components/tenant/LeaseTemplateViewer";

/**
 * Landlord/tenant lease management page.
 *
 * Renamed from "Pending Leases" → "Leases" with two tabs:
 *   - Pending: needs at least one signature
 *   - Signed: both signatures present
 */
function LeaseRow({
  lease,
  onOpen,
  signing,
  onSign,
}: {
  lease: LeaseAgreement;
  onOpen: () => void;
  signing: boolean;
  onSign: () => void;
}) {
  const { user } = useAuth();
  const isTenant = lease.tenant_user_id === user?.id;
  const isLandlord = lease.landlord_user_id === user?.id;
  const fullySigned = lease.tenant_signed && lease.landlord_signed;
  const needsMySignature =
    (isTenant && !lease.tenant_signed) || (isLandlord && !lease.landlord_signed);
  const waitingForOther =
    (isTenant && lease.tenant_signed && !lease.landlord_signed) ||
    (isLandlord && lease.landlord_signed && !lease.tenant_signed);

  return (
    <Card className={`border-l-4 ${fullySigned ? "border-l-success" : "border-l-accent"}`}>
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
              fullySigned
                ? "bg-success/10 text-success"
                : needsMySignature
                ? "bg-warning/10 text-warning"
                : waitingForOther
                ? "bg-accent/10 text-accent"
                : "bg-muted text-muted-foreground"
            }
          >
            {fullySigned
              ? "Fully Signed"
              : needsMySignature
              ? "Needs Your Signature"
              : waitingForOther
              ? `Pending ${isTenant ? "Landlord" : "Tenant"}`
              : "Awaiting Signature"}
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
          <Button variant="outline" onClick={onOpen} className="gap-2">
            <Eye className="h-4 w-4" />
            Open Lease
          </Button>

          {needsMySignature ? (
            <Button onClick={onSign} disabled={signing} className="gap-2">
              {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pen className="h-4 w-4" />}
              Sign Lease
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground text-center self-center">
              {fullySigned ? "Both parties have signed." : "Waiting for counter-signature."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PendingLeasesPage() {
  const { user } = useAuth();
  const { data: agreements, isLoading } = useMyLeaseAgreements();
  const signLease = useSignLeaseAgreement();
  const [viewing, setViewing] = useState<LeaseAgreement | null>(null);

  if (viewing) {
    return <LeaseTemplateViewer agreement={viewing} onBack={() => setViewing(null)} />;
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const all = agreements ?? [];
  const pending = all.filter((a) => !(a.tenant_signed && a.landlord_signed));
  const signed = all.filter((a) => a.tenant_signed && a.landlord_signed);

  if (all.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-muted-foreground">No lease agreements yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={pending.length > 0 ? "pending" : "signed"} className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" /> Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="signed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Signed ({signed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No lease agreements awaiting signature.
            </p>
          ) : (
            pending.map((lease) => {
              const isTenant = lease.tenant_user_id === user?.id;
              return (
                <LeaseRow
                  key={lease.id}
                  lease={lease}
                  onOpen={() => setViewing(lease)}
                  signing={signLease.isPending}
                  onSign={() =>
                    signLease.mutate({
                      agreementId: lease.id,
                      role: isTenant ? "tenant" : "landlord",
                    })
                  }
                />
              );
            })
          )}
        </TabsContent>

        <TabsContent value="signed" className="mt-4 space-y-3">
          {signed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No fully-signed leases yet.
            </p>
          ) : (
            signed.map((lease) => {
              const isTenant = lease.tenant_user_id === user?.id;
              return (
                <LeaseRow
                  key={lease.id}
                  lease={lease}
                  onOpen={() => setViewing(lease)}
                  signing={signLease.isPending}
                  onSign={() =>
                    signLease.mutate({
                      agreementId: lease.id,
                      role: isTenant ? "tenant" : "landlord",
                    })
                  }
                />
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
