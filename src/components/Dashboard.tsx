import { useState } from "react";
import { Building2, Users, Banknote, AlertTriangle, Plus, Loader2, ArrowRight, Wrench, TrendingUp, Crown } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PropertyCard } from "@/components/PropertyCard";
import { TenantCard } from "@/components/TenantCard";
import { PropertyFormDialog } from "@/components/PropertyFormDialog";
import { TenantFormDialog } from "@/components/TenantFormDialog";
import { PaymentHistorySheet } from "@/components/PaymentHistorySheet";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProperties, PropertyWithStats } from "@/hooks/useProperties";
import { useTenants, TenantWithDetails } from "@/hooks/useTenants";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionContext } from "@/hooks/useSubscriptionContext";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { useMyLeaseAgreements } from "@/hooks/useLeaseAgreements";
import { PLAN_CONFIGS } from "@/hooks/useSubscription";

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { isAdmin, isLandlord } = useAuth();
  const { canAddProperty, isReadOnly, plan, hasFeature } = useSubscriptionContext();
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithStats | undefined>();
  const [editingTenant, setEditingTenant] = useState<TenantWithDetails | undefined>();
  const [paymentTenant, setPaymentTenant] = useState<TenantWithDetails | null>(null);

  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: maintenanceRequests } = useMaintenanceRequests();
  const { data: agreements } = useMyLeaseAgreements();

  const totalProperties = properties?.length || 0;
  const totalTenants = tenants?.length || 0;
  const monthlyRevenue = properties?.reduce((sum, p) => sum + Number(p.monthly_rent), 0) || 0;
  const overduePayments = tenants?.filter((t) => t.payment_status === "overdue").length || 0;
  const pendingMaintenance = maintenanceRequests?.filter((r) => r.status === "pending" || r.status === "in_progress").length || 0;

  const handleEditProperty = (property: PropertyWithStats) => { setEditingProperty(property); setPropertyDialogOpen(true); };
  const handleEditTenant = (tenant: TenantWithDetails) => { setEditingTenant(tenant); setTenantDialogOpen(true); };
  const handleViewPayments = (tenant: TenantWithDetails) => { setPaymentTenant(tenant); setPaymentSheetOpen(true); };
  const handlePropertyDialogClose = (open: boolean) => { setPropertyDialogOpen(open); if (!open) setEditingProperty(undefined); };
  const handleTenantDialogClose = (open: boolean) => { setTenantDialogOpen(open); if (!open) setEditingTenant(undefined); };
  const handlePaymentSheetClose = (open: boolean) => { setPaymentSheetOpen(open); if (!open) setPaymentTenant(null); };

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

  // Plan-based smart hints
  const planHints: Record<string, { title: string; description: string; action: string; view: string }> = {
    free: { title: "You're on the Free plan", description: "Manage 1 property with basic tools. Upgrade to unlock maintenance, financials, and more.", action: "View Plans", view: "subscription" },
    basic: { title: "Starter plan active", description: "You have maintenance access. Upgrade to Pro for financial intelligence and reports.", action: "Upgrade to Pro", view: "subscription" },
    pro: { title: "Pro plan active", description: "Unlock automation workflows and consultant access with the Business plan.", action: "Go Business", view: "subscription" },
    business: { title: "Business plan — Full access", description: "You have access to all RentPal features including automation and consultants.", action: "", view: "" },
  };

  const currentHint = planHints[plan] || planHints.free;

  return (
    <div className="space-y-8">
      <SubscriptionBanner onNavigateToPlans={() => onNavigate?.("subscription")} />

      {/* Plan-based hint */}
      {plan !== "business" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{currentHint.title}</p>
              <p className="text-xs text-muted-foreground">{currentHint.description}</p>
            </div>
            {currentHint.action && (
              <Button size="sm" variant="outline" onClick={() => onNavigate?.(currentHint.view)} className="gap-1.5">
                {currentHint.action} <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Smart onboarding hints */}
      {totalProperties === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Get started by adding your first property</p>
              <p className="text-xs text-muted-foreground">Once you add a property, you can start managing tenants, payments, and maintenance.</p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => {
              if (!canAddProperty) { setUpgradeOpen(true); return; }
              setPropertyDialogOpen(true);
            }} disabled={isReadOnly}>
              <Plus className="h-3.5 w-3.5" /> Add Property
            </Button>
          </CardContent>
        </Card>
      )}
      {totalProperties > 0 && totalTenants === 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Add your first tenant</p>
              <p className="text-xs text-muted-foreground">Link a tenant to one of your properties to start tracking payments and leases.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate?.("tenants")} disabled={isReadOnly}>
              <Plus className="h-3.5 w-3.5" /> Add Tenant
            </Button>
          </CardContent>
        </Card>
      )}
      {totalTenants > 0 && overduePayments === 0 && !hasFeature("financials") && plan !== "free" && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <Banknote className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Unlock Financial Intelligence</p>
              <p className="text-xs text-muted-foreground">Upgrade to Pro to access rent tracking, expense reports, and financial statements.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate?.("subscription")}>
              Upgrade <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button className="text-left" onClick={() => onNavigate?.("properties")}>
          <StatCard title="Total Properties" value={totalProperties} icon={Building2} variant="default" />
        </button>
        <button className="text-left" onClick={() => onNavigate?.("tenants")}>
          <StatCard title="Total Tenants" value={totalTenants} icon={Users} variant="accent" />
        </button>
        <button className="text-left" onClick={() => onNavigate?.("finance")}>
          <StatCard title="Monthly Revenue" value={`₦${monthlyRevenue.toLocaleString()}`} icon={Banknote} variant="success" />
        </button>
        <button className="text-left" onClick={() => onNavigate?.("finance")}>
          <StatCard title="Overdue Payments" value={overduePayments} icon={AlertTriangle} variant="default" />
        </button>
      </div>

      {/* Quick Actions & Alerts */}
      {(pendingMaintenance > 0 || overduePayments > 0) && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pendingMaintenance > 0 && (
            <Card className="border-accent/30 bg-accent/5 cursor-pointer hover:shadow-card transition-shadow" onClick={() => onNavigate?.("maintenance-portal")}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <Wrench className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{pendingMaintenance} Maintenance Request{pendingMaintenance > 1 ? "s" : ""}</p>
                  <p className="text-xs text-muted-foreground">Pending or in progress</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          )}
          {overduePayments > 0 && (
            <Card className="border-destructive/30 bg-destructive/5 cursor-pointer hover:shadow-card transition-shadow" onClick={() => onNavigate?.("finance")}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{overduePayments} Overdue Payment{overduePayments > 1 ? "s" : ""}</p>
                  <p className="text-xs text-muted-foreground">Requires attention</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Properties Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Your Properties</h2>
            {totalProperties > 3 && (
              <button onClick={() => onNavigate?.("properties")} className="text-sm text-primary hover:underline mt-0.5">
                View all {totalProperties} properties →
              </button>
            )}
          </div>
          <Button onClick={() => {
            if (isReadOnly) return;
            if (!canAddProperty) { setUpgradeOpen(true); return; }
            setPropertyDialogOpen(true);
          }} className="gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90" disabled={isReadOnly}>
            <Plus className="h-4 w-4" /> Add Property
          </Button>
        </div>
        {properties && properties.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.slice(0, 6).map((property) => (
              <PropertyCard key={property.id} property={property} onEdit={handleEditProperty} onClick={(p) => onNavigate?.("properties")} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No properties yet"
            description="Add your first property to get started with tenant and payment management."
            actionLabel="Add Property"
            onAction={() => {
              if (isReadOnly) return;
              if (!canAddProperty) { setUpgradeOpen(true); return; }
              setPropertyDialogOpen(true);
            }}
          />
        )}
      </section>

      {/* Tenants Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Recent Tenants</h2>
            {totalTenants > 4 && (
              <button onClick={() => onNavigate?.("tenants")} className="text-sm text-primary hover:underline mt-0.5">
                View all {totalTenants} tenants →
              </button>
            )}
          </div>
          <Button onClick={() => !isReadOnly && setTenantDialogOpen(true)} variant="outline" className="gap-2" disabled={isReadOnly || !properties || properties.length === 0}>
            <Plus className="h-4 w-4" /> Add Tenant
          </Button>
        </div>
        {tenants && tenants.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {tenants.slice(0, 4).map((tenant) => (
              <TenantCard key={tenant.id} tenant={tenant} onEdit={handleEditTenant} onViewPayments={handleViewPayments} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No tenants yet"
            description={properties && properties.length > 0 ? "Add your first tenant to a property." : "Add a property first, then add tenants."}
          />
        )}
      </section>

      {/* Dialogs */}
      <PropertyFormDialog open={propertyDialogOpen} onOpenChange={handlePropertyDialogClose} property={editingProperty} />
      <TenantFormDialog open={tenantDialogOpen} onOpenChange={handleTenantDialogClose} tenant={editingTenant} />
      <PaymentHistorySheet open={paymentSheetOpen} onOpenChange={handlePaymentSheetClose} tenant={paymentTenant} />
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason="property_limit" onNavigateToPlans={() => onNavigate?.("subscription")} />
    </div>
  );
}
