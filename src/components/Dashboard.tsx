import { useState } from "react";
import { Building2, Users, Banknote, AlertTriangle, Plus, Loader2, ArrowRight, Wrench, TrendingUp, Crown, BookOpen, Home, CalendarIcon } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyFormDialog } from "@/components/PropertyFormDialog";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProperties, PropertyWithStats } from "@/hooks/useProperties";
import { useLandlordTenants } from "@/hooks/useLandlordTenants";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionContext } from "@/hooks/useSubscriptionContext";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { useMyLeaseAgreements } from "@/hooks/useLeaseAgreements";
import { useMyBookings } from "@/hooks/useBookings";
import { PLAN_CONFIGS } from "@/hooks/useSubscription";
import { formatCurrency } from "@/lib/formatCurrency";
import { format, parseISO } from "date-fns";

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { isAdmin, isLandlord, isTenant, isMaintenance, isVendor, isConsultant, profile } = useAuth();
  const { canAddProperty, isReadOnly, plan, hasFeature } = useSubscriptionContext();
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithStats | undefined>();

  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: tenants = [], isLoading: tenantsLoading } = useLandlordTenants();
  const { data: maintenanceRequests } = useMaintenanceRequests();
  const { data: agreements } = useMyLeaseAgreements();
  const { data: myBookings } = useMyBookings();

  const isManagerRole = isAdmin || isLandlord || isConsultant;
  const isTenantOnly = isTenant && !isAdmin && !isConsultant && !isLandlord && !isMaintenance && !isVendor;

  const totalProperties = properties?.length || 0;
  const totalTenants = tenants.length;
  const monthlyRevenue = properties?.reduce((sum, p) => sum + Number(p.monthly_rent), 0) || 0;
  const overduePayments = tenants.filter((t) => t.payment_status === "overdue").length;
  const pendingMaintenance = maintenanceRequests?.filter((r) => r.status === "pending" || r.status === "in_progress").length || 0;

  // Pending leases needing signature
  const pendingLeases = agreements?.filter(a => a.status === "pending_signature" || (a.status === "draft" && (a.tenant_signed || a.landlord_signed))) || [];

  const handleEditProperty = (property: PropertyWithStats) => { setEditingProperty(property); setPropertyDialogOpen(true); };
  const handlePropertyDialogClose = (open: boolean) => { setPropertyDialogOpen(open); if (!open) setEditingProperty(undefined); };

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

  // Plan-based smart hints (landlord only)
  const planHints: Record<string, { title: string; description: string; action: string; view: string }> = {
    free: { title: "You're on the Free plan", description: "Manage 1 property with basic tools. Upgrade to unlock maintenance, financials, and more.", action: "View Plans", view: "subscription" },
    basic: { title: "Starter plan active", description: "You have maintenance access. Upgrade to Pro for financial intelligence and reports.", action: "Upgrade to Pro", view: "subscription" },
    pro: { title: "Pro plan active", description: "Unlock automation workflows and consultant access with the Business plan.", action: "Go Business", view: "subscription" },
    business: { title: "Business plan — Full access", description: "You have access to all RentPal features including automation and consultants.", action: "", view: "" },
  };

  const currentHint = planHints[plan] || planHints.free;

  const showQuickGuide = isManagerRole && profile?.onboarding_completed && totalProperties === 0;

  // For tenant dashboard: show properties they have bookings/leases for
  const tenantPropertyIds = new Set<string>();
  myBookings?.forEach(b => tenantPropertyIds.add(b.property_id));
  agreements?.forEach(a => tenantPropertyIds.add(a.property_id));

  return (
    <div className="space-y-8">
      {/* Subscription banner - landlord/admin only */}
      {isManagerRole && (
        <SubscriptionBanner onNavigateToPlans={() => onNavigate?.("subscription")} />
      )}

      {/* Post-onboarding quick guide - landlord only */}
      {showQuickGuide && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Quick Start Guide</p>
              <p className="text-xs text-muted-foreground">Add a property → Tenants will find and book it → You manage everything from here!</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
              if (!canAddProperty) { setUpgradeOpen(true); return; }
              setPropertyDialogOpen(true);
            }}>
              <Plus className="h-3.5 w-3.5" /> Add Property
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plan-based hint - landlord only */}
      {isManagerRole && plan !== "business" && (
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

      {/* Smart onboarding hints - landlord/admin only */}
      {isManagerRole && totalProperties === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Get started by adding your first property</p>
              <p className="text-xs text-muted-foreground">Once you add a property, tenants can find, book, and rent it through the platform.</p>
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

      {/* Pending leases notification */}
      {pendingLeases.length > 0 && (
        <Card className="border-accent/30 bg-accent/5 cursor-pointer hover:shadow-card transition-shadow" onClick={() => onNavigate?.("pending-leases")}>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <CalendarIcon className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{pendingLeases.length} Lease{pendingLeases.length > 1 ? "s" : ""} Awaiting Signature</p>
              <p className="text-xs text-muted-foreground">Review and sign pending lease agreements</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {/* Financial upgrade hint - landlord only */}
      {isManagerRole && totalTenants > 0 && overduePayments === 0 && !hasFeature("financials") && plan !== "free" && (
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
      {isManagerRole && (
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
      )}

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

      {/* Properties Section - landlord view */}
      {isManagerRole && (
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
                <PropertyCard
                  key={property.id}
                  property={property}
                  onEdit={handleEditProperty}
                  onClick={(p) => onNavigate?.(`property-command:${p.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="No properties yet"
              description="Add your first property to get started. Tenants will find and book it through the platform."
              actionLabel="Add Property"
              onAction={() => {
                if (isReadOnly) return;
                if (!canAddProperty) { setUpgradeOpen(true); return; }
                setPropertyDialogOpen(true);
              }}
            />
          )}
        </section>
      )}

      {/* Tenant dashboard: My Bookings/Reservations */}
      {isTenantOnly && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-foreground">My Reservations</h2>
            <Button variant="outline" className="gap-2" onClick={() => onNavigate?.("browse-properties")}>
              <Building2 className="h-4 w-4" /> Browse Properties
            </Button>
          </div>
          {myBookings && myBookings.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myBookings.slice(0, 6).map((booking) => (
                <Card key={booking.id} className="cursor-pointer hover:shadow-card transition-shadow" onClick={() => onNavigate?.(`property-detail:${booking.property_id}`)}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={booking.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                        {booking.status}
                      </Badge>
                      <Badge variant="outline" className={booking.payment_status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                        {booking.payment_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(booking.check_in), "MMM d, yyyy")} – {format(parseISO(booking.check_out), "MMM d, yyyy")}
                    </p>
                    <p className="font-medium text-foreground">{formatCurrency(booking.total_price, "NGN")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Home}
              title="No reservations yet"
              description="Browse available properties and make your first booking."
              actionLabel="Browse Properties"
              onAction={() => onNavigate?.("browse-properties")}
            />
          )}
        </section>
      )}

      {/* Dialogs */}
      <PropertyFormDialog open={propertyDialogOpen} onOpenChange={handlePropertyDialogClose} property={editingProperty} />
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason="property_limit" onNavigateToPlans={() => onNavigate?.("subscription")} />
    </div>
  );
}
