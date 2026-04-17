import { format, differenceInDays } from "date-fns";
import {
  Building2, Calendar, FileText, CheckCircle2, Loader2,
  User, Banknote, MapPin, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { useMyLeaseAgreements } from "@/hooks/useLeaseAgreements";
import { formatCurrency } from "@/lib/formatCurrency";

/**
 * Tenant Lease page — renders the fully-signed lease agreement
 * for the active tenant. Pure read view, scoped to auth.uid().
 */
export function TenantLeasePage() {
  const { tenancy, isLoading } = useActiveTenant();
  const { data: leases = [], isLoading: leasesLoading } = useMyLeaseAgreements();

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
  const daysRemaining = differenceInDays(new Date(tenancy.lease_end), new Date());

  return (
    <div className="space-y-6">
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
