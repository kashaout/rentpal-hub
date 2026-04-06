import { format, differenceInDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Banknote, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { TenantLeaseInfo } from "@/hooks/useTenantPortal";
import { usePaymentsByTenant } from "@/hooks/usePayments";

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
  const daysLeft = differenceInDays(new Date(lease.lease_end), new Date());
  const totalPaid = payments?.filter(p => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0) || 0;

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
                <Badge variant="outline" className={`text-sm ${statusStyles[lease.payment_status] || ""}`}>{lease.payment_status}</Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}
