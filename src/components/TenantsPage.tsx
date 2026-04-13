import { useState } from "react";
import { Users, Search, Filter, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TenantCard } from "@/components/TenantCard";
import { PaymentHistorySheet } from "@/components/PaymentHistorySheet";
import { EmptyState } from "@/components/ui/empty-state";
import { useTenants, TenantWithDetails } from "@/hooks/useTenants";
import { useProperties } from "@/hooks/useProperties";

export function TenantsPage() {
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentTenant, setPaymentTenant] = useState<TenantWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");

  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: properties, isLoading: propertiesLoading } = useProperties();

  const handleViewPayments = (tenant: TenantWithDetails) => {
    setPaymentTenant(tenant);
    setPaymentSheetOpen(true);
  };

  const handlePaymentSheetClose = (open: boolean) => {
    setPaymentSheetOpen(open);
    if (!open) setPaymentTenant(null);
  };

  const filteredTenants = tenants?.filter((t) => {
    const matchesSearch =
      t.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.property_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.unit_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || t.payment_status === filterStatus;
    const matchesProperty = filterProperty === "all" || t.property_id === filterProperty;
    return matchesSearch && matchesStatus && matchesProperty;
  });

  const isLoading = tenantsLoading || propertiesLoading;
  const hasFilters = searchQuery || filterStatus !== "all" || filterProperty !== "all";

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading tenants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar - no Add Tenant button; tenants are created via booking flow */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search tenants..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border bg-muted/50 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Tenants appear here automatically when they book or lease a property through the platform.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Tenants</p>
          <p className="text-2xl font-semibold text-foreground">{tenants?.length || 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Paid This Month</p>
          <p className="text-2xl font-semibold text-success">{tenants?.filter((t) => t.payment_status === "paid").length || 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-2xl font-semibold text-destructive">{tenants?.filter((t) => t.payment_status === "overdue").length || 0}</p>
        </div>
      </div>

      {/* Tenants Grid */}
      {filteredTenants && filteredTenants.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredTenants.map((tenant) => (
            <TenantCard key={tenant.id} tenant={tenant} onEdit={() => {}} onViewPayments={handleViewPayments} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={hasFilters ? "No tenants found" : "No tenants yet"}
          description={
            hasFilters
              ? "Try adjusting your filters."
              : "Tenants will appear here automatically when they book or lease one of your properties."
          }
        />
      )}

      {/* Dialogs */}
      <PaymentHistorySheet open={paymentSheetOpen} onOpenChange={handlePaymentSheetClose} tenant={paymentTenant} />
    </div>
  );
}
