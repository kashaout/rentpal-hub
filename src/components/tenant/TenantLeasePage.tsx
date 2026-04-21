import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import {
  Building2, Calendar, FileText, CheckCircle2, Loader2,
  User, Banknote, MapPin, Clock, Wifi, KeyRound, Lock, Download, Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { useMyLeaseAgreements } from "@/hooks/useLeaseAgreements";
import { useLeaseCredentials } from "@/hooks/useLeaseCredentials";
import { formatCurrency } from "@/lib/formatCurrency";
import { buildLeaseHtml, printLeaseHtml, emailLeaseHtml } from "@/lib/leaseExport";
import { useToast } from "@/hooks/use-toast";

/**
 * Tenant Lease page — renders the fully-signed lease agreement
 * for the active tenant. Pure read view, scoped to auth.uid().
 */
export function TenantLeasePage() {
  const { tenancy, isLoading } = useActiveTenant();
  const { data: leases = [], isLoading: leasesLoading } = useMyLeaseAgreements();
  const { data: credentials } = useLeaseCredentials(tenancy?.lease_id);
  const { toast } = useToast();
  const [emailing, setEmailing] = useState(false);

  if (isLoading || leasesLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenancy) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">No active lease</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          You'll see your lease here once both you and the landlord have signed it.
        </p>
      </div>
    );
  }

  // Find the full lease record (we're the tenant on this lease)
  const lease = leases.find(l => l.id === tenancy.lease_id);
  const buildHtml = () => {
    if (!lease) return "";
    return buildLeaseHtml({
      landlordName: lease.landlord_name,
      tenantName: lease.tenant_name,
      unitNumber: lease.unit_number,
      leaseStart: lease.lease_start,
      leaseEnd: lease.lease_end,
      rentAmount: lease.rent_amount,
      currency: lease.currency,
      terms: lease.terms,
      landlordSignedAt: lease.landlord_signed_at,
      tenantSignedAt: lease.tenant_signed_at,
    });
  };

  const handleDownload = () => {
    printLeaseHtml(buildHtml(), `Lease — Unit ${tenancy.unit_number}`);
  };

  const handleEmail = async () => {
    setEmailing(true);
    try {
      await emailLeaseHtml({ html: buildHtml(), subject: `Your RentPal lease — Unit ${tenancy.unit_number}` });
      toast({ title: "Email sent", description: "Lease agreement sent to your email." });
    } catch {
      toast({ title: "Email failed", description: "Could not send lease email.", variant: "destructive" });
    } finally {
      setEmailing(false);
    }
  };

  const daysRemaining = differenceInDays(new Date(tenancy.lease_end), new Date());

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
          <Download className="h-4 w-4" /> Download PDF
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEmail} disabled={emailing}>
          {emailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Email Me a Copy
        </Button>
      </div>

      {/* Status banner */}
      <Card className="border-success/30 bg-success/5">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
          <div>
            <p className="font-semibold">Lease fully signed</p>
            <p className="text-sm text-muted-foreground">
              Both you and your landlord have signed this agreement.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Property & lease overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Property</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{tenancy.property_name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" /> {tenancy.property_address}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Unit / Rent</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-semibold">Unit {tenancy.unit_number}</p>
            <p className="text-lg font-bold mt-1">
              {formatCurrency(tenancy.rent_amount, tenancy.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Lease Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {format(new Date(tenancy.lease_start), "MMM d, yyyy")}
            </p>
            <p className="text-sm text-muted-foreground">
              → {format(new Date(tenancy.lease_end), "MMM d, yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {daysRemaining > 0 ? (
              <>
                <p className="text-lg font-bold">{daysRemaining}</p>
                <p className="text-xs text-muted-foreground">days remaining</p>
              </>
            ) : (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                Lease expired
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lease parties + signatures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Parties
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground tracking-wider">Tenant</p>
            <p className="font-medium mt-1">{lease?.tenant_name ?? "You"}</p>
            <p className="text-xs text-success mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Signed {tenancy.tenant_signed_at && format(new Date(tenancy.tenant_signed_at), "MMM d, yyyy")}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground tracking-wider">Landlord</p>
            <p className="font-medium mt-1">{lease?.landlord_name ?? "Landlord"}</p>
            <p className="text-xs text-success mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Signed {tenancy.landlord_signed_at && format(new Date(tenancy.landlord_signed_at), "MMM d, yyyy")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Access credentials — only visible after both parties sign + landlord sets them */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Access Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {credentials && (credentials.wifi_password || credentials.keybox_password) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {credentials.wifi_password && (
                <div className="rounded-lg border bg-background p-3">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <Wifi className="h-3.5 w-3.5" /> WiFi Password
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold break-all">
                    {credentials.wifi_password}
                  </p>
                </div>
              )}
              {credentials.keybox_password && (
                <div className="rounded-lg border bg-background p-3">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <KeyRound className="h-3.5 w-3.5" /> Door / Keybox Code
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold break-all">
                    {credentials.keybox_password}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                WiFi and door codes will appear here once your landlord shares them.
                Codes are released after both parties have signed the lease.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lease terms */}
      {lease?.terms && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Lease Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/80">
              {lease.terms}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
