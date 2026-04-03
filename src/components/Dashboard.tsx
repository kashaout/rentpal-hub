import { useState } from "react";
import { Building2, Users, Banknote, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PropertyCard } from "@/components/PropertyCard";
import { TenantCard } from "@/components/TenantCard";
import { PropertyFormDialog } from "@/components/PropertyFormDialog";
import { TenantFormDialog } from "@/components/TenantFormDialog";
import { PaymentHistorySheet } from "@/components/PaymentHistorySheet";
import { Button } from "@/components/ui/button";
import { useProperties, PropertyWithStats } from "@/hooks/useProperties";
import { useTenants, TenantWithDetails } from "@/hooks/useTenants";

export function Dashboard() {
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithStats | undefined>();
  const [editingTenant, setEditingTenant] = useState<TenantWithDetails | undefined>();
  const [paymentTenant, setPaymentTenant] = useState<TenantWithDetails | null>(null);

  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();

  // Calculate stats
  const totalProperties = properties?.length || 0;
  const totalTenants = tenants?.length || 0;
  const monthlyRevenue = properties?.reduce((sum, p) => sum + Number(p.monthly_rent), 0) || 0;
  const overduePayments = tenants?.filter((t) => t.payment_status === "overdue").length || 0;

  const handleEditProperty = (property: PropertyWithStats) => {
    setEditingProperty(property);
    setPropertyDialogOpen(true);
  };

  const handleEditTenant = (tenant: TenantWithDetails) => {
    setEditingTenant(tenant);
    setTenantDialogOpen(true);
  };

  const handleViewPayments = (tenant: TenantWithDetails) => {
    setPaymentTenant(tenant);
    setPaymentSheetOpen(true);
  };

  const handlePropertyDialogClose = (open: boolean) => {
    setPropertyDialogOpen(open);
    if (!open) setEditingProperty(undefined);
  };

  const handleTenantDialogClose = (open: boolean) => {
    setTenantDialogOpen(open);
    if (!open) setEditingTenant(undefined);
  };

  const handlePaymentSheetClose = (open: boolean) => {
    setPaymentSheetOpen(open);
    if (!open) setPaymentTenant(null);
  };

  const isLoading = propertiesLoading || tenantsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Properties"
          value={totalProperties}
          icon={Building2}
          variant="default"
        />
        <StatCard
          title="Total Tenants"
          value={totalTenants}
          icon={Users}
          variant="accent"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Overdue Payments"
          value={overduePayments}
          icon={AlertTriangle}
          variant="default"
        />
      </div>

      {/* Properties Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Your Properties
          </h2>
          <Button
            onClick={() => setPropertyDialogOpen(true)}
            className="gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </div>
        {properties && properties.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onEdit={handleEditProperty}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-4 font-medium text-foreground">No properties yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first property to get started.
            </p>
            <Button
              onClick={() => setPropertyDialogOpen(true)}
              className="mt-4 gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          </div>
        )}
      </section>

      {/* Tenants Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Recent Tenants
          </h2>
          <Button
            onClick={() => setTenantDialogOpen(true)}
            variant="outline"
            className="gap-2"
            disabled={!properties || properties.length === 0}
          >
            <Plus className="h-4 w-4" />
            Add Tenant
          </Button>
        </div>
        {tenants && tenants.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {tenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onEdit={handleEditTenant}
                onViewPayments={handleViewPayments}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-4 font-medium text-foreground">No tenants yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {properties && properties.length > 0
                ? "Add your first tenant to a property."
                : "Add a property first, then add tenants."}
            </p>
          </div>
        )}
      </section>

      {/* Dialogs */}
      <PropertyFormDialog
        open={propertyDialogOpen}
        onOpenChange={handlePropertyDialogClose}
        property={editingProperty}
      />
      <TenantFormDialog
        open={tenantDialogOpen}
        onOpenChange={handleTenantDialogClose}
        tenant={editingTenant}
      />
      <PaymentHistorySheet
        open={paymentSheetOpen}
        onOpenChange={handlePaymentSheetClose}
        tenant={paymentTenant}
      />
    </div>
  );
}
