import { useState } from "react";
import { format } from "date-fns";
import { Users, Search, Filter, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/formatCurrency";
import { useLandlordLifecycle, type LandlordTenantDerived } from "@/hooks/lifecycle";

type LandlordTenantRow = LandlordTenantDerived;

const statusStyle: Record<string, string> = {
  paid: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

export function TenantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");

  // CANONICAL: derive tenants from the lifecycle chain
  // (properties -> bookings -> lease_agreements). Never read tenants table.
  const { tenants, isLoading } = useLandlordLifecycle();

  const propertyOptions = Array.from(
    new Map(tenants.map((t) => [t.property_id, t.property_name])).entries()
  );

  const filtered = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.tenant_name?.toLowerCase().includes(q) ||
      t.tenant_email?.toLowerCase().includes(q) ||
      t.property_name?.toLowerCase().includes(q) ||
      t.unit_number?.toLowerCase().includes(q);
    const matchesStatus = filterStatus === "all" || t.payment_status === filterStatus;
    const matchesProperty = filterProperty === "all" || t.property_id === filterProperty;
    return matchesSearch && matchesStatus && matchesProperty;
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const hasFilters = !!searchQuery || filterStatus !== "all" || filterProperty !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search tenants..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Properties" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {propertyOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/50 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Tenants populate from lease agreements where both you and the tenant have signed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Tenants</p>
          <p className="text-2xl font-semibold text-foreground">{tenants.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Fully Signed</p>
          <p className="text-2xl font-semibold text-success">{tenants.filter((t) => t.fully_signed).length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-2xl font-semibold text-destructive">{tenants.filter((t) => t.payment_status === "overdue").length}</p>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((t) => <TenantRow key={t.id} tenant={t} />)}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={hasFilters ? "No tenants found" : "No tenants yet"}
          description={
            hasFilters
              ? "Try adjusting your filters."
              : "Tenants will appear automatically once you and the tenant have both signed a lease."
          }
        />
      )}
    </div>
  );
}

function TenantRow({ tenant }: { tenant: LandlordTenantRow }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold truncate">{tenant.tenant_name}</p>
            <p className="text-xs text-muted-foreground truncate">{tenant.tenant_email ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tenant.property_name} • Unit {tenant.unit_number}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className={statusStyle[tenant.payment_status]}>
              {tenant.payment_status}
            </Badge>
            {tenant.fully_signed ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" /> Signed
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground gap-1 text-xs">
                <Clock className="h-3 w-3" /> Pending
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Rent</span>
          <span className="font-medium">{formatCurrency(tenant.rent_amount, tenant.currency)}</span>
        </div>
        {tenant.lease_start && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(tenant.lease_start), "MMM d, yyyy")} – {format(new Date(tenant.lease_end), "MMM d, yyyy")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

