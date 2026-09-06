import { format, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Banknote, Clock, Star, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { TenantLeaseInfo } from "@/hooks/useTenantPortal";
import { usePaymentsByTenant } from "@/hooks/usePayments";
import { useTenantPaidStatus } from "@/hooks/useTenantPaidStatus";
import { NotesSection } from "@/components/NotesSection";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTenantPropertyLifecycle } from "@/hooks/lifecycle/useTenantLifecycle";
import { CheckoutDialog } from "@/components/tenant/CheckoutDialog";

interface Props {
  lease: TenantLeaseInfo;
}

const statusStyles: Record<string, string> = {
  paid: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

export function TenantOverviewTab({ lease }: Props) {
  const { data: payments } = usePaymentsByTenant(lease.id);
  const { data: paid } = useTenantPaidStatus(lease.property_id);
  const tenancy = useTenantPropertyLifecycle(lease.property_id);
  const daysLeft = differenceInDays(new Date(lease.lease_end), new Date());
  const totalPaid = payments?.filter(p => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  // Derive payment status entirely from payments/bookings chain — no legacy fallback
  const effectiveStatus = paid?.paid ? "paid" : "pending";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unit</p>
                <p className="text-2xl font-bold">{lease.unit_number}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Banknote className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="text-2xl font-bold">{formatCurrency(lease.rent_amount, "NGN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days Left</p>
                <p className="text-2xl font-bold">{daysLeft > 0 ? daysLeft : 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <Badge variant="outline" className={`text-sm capitalize ${statusStyles[effectiveStatus] || ""}`}>
                  {effectiveStatus === "paid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {effectiveStatus}
                </Badge>
                {paid?.paid && paid.lastPaymentAmount && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(paid.lastPaymentAmount, "NGN")}
                    {paid.lastPaymentDate ? ` · ${format(new Date(paid.lastPaymentDate), "MMM d")}` : ""}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Lease Start</p>
              <p className="font-medium">{format(new Date(lease.lease_start), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lease End</p>
              <p className="font-medium">{format(new Date(lease.lease_end), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="font-medium text-success">{formatCurrency(totalPaid, "NGN")}</p>
            </div>
          </div>

          {tenancy?.canCheckout && (
            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Moving out?</p>
                <p className="text-sm text-muted-foreground">
                  Completing checkout ends your tenancy and releases the unit. Your records stay available.
                </p>
              </div>
              <CheckoutDialog
                leaseId={tenancy.lease_id!}
                propertyName={lease.property_name}
                label="Complete Checkout"
              />
            </div>
          )}
          {tenancy?.checked_out_at && (
            <div className="border-t pt-4">
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                Tenancy ended · checked out {format(new Date(tenancy.checked_out_at), "MMM d, yyyy")}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <NotesSection
        notes={lease.notes ?? null}
        onSave={async (notes) => {
          await supabase.from("tenants").update({ notes }).eq("id", lease.id);
        }}
      />

      {/* Tenant Reviews */}
      <TenantReviewsSection propertyId={lease.property_id} />
    </div>
  );
}

function TenantReviewsSection({ propertyId }: { propertyId: string }) {
  const { data: reviews } = useQuery({
    queryKey: ["tenant-property-reviews", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("property_id", propertyId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!propertyId,
  });

  if (!reviews?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-4 w-4 text-warning" /> Recent Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.map((review: any) => (
          <div key={review.id} className="flex items-start gap-3 border-b last:border-0 pb-3 last:pb-0">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`h-3 w-3 ${i <= review.overall_rating ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              {review.comment && <p className="text-sm text-muted-foreground line-clamp-2">{review.comment}</p>}
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(review.created_at), "MMM d, yyyy")}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
