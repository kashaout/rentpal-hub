import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SessionTimeoutDialog } from "@/components/SessionTimeoutDialog";
import { Header } from "@/components/Header";
import { FeedbackButton } from "@/components/FeedbackButton";
import { TenantHelpWidget } from "@/components/tenant/TenantHelpWidget";
import { Dashboard } from "@/components/Dashboard";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { LandlordUserManagement } from "@/components/admin/LandlordUserManagement";
import { TenantPortal } from "@/components/tenant/TenantPortal";
import { TenantCommandCenter } from "@/components/tenant/TenantCommandCenter";
import { TenantBrowseProperties } from "@/components/tenant/TenantBrowseProperties";
import { MyBookingsPage } from "@/components/tenant/MyBookingsPage";
import { TenantRequestsInbox } from "@/components/tenant/TenantRequestsInbox";
import { MaintenancePortal } from "@/components/maintenance/MaintenancePortal";
import { PropertiesPage } from "@/components/PropertiesPage";
import { TenantsPage } from "@/components/TenantsPage";
import { SettingsPage } from "@/components/SettingsPage";
import { ReportsPage } from "@/components/ReportsPage";

import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import { SubscriptionPlans } from "@/components/subscription/SubscriptionPlans";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { PendingLeasesPage } from "@/components/PendingLeasesPage";
import { PropertyDetailView } from "@/components/PropertyDetailView";
import { PropertyCommandCenter } from "@/components/property/PropertyCommandCenter";
import { TenantLeasePage } from "@/components/tenant/TenantLeasePage";
import { TenantReportsPage } from "@/components/tenant/TenantReportsPage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const viewTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Welcome back! Here's your overview." },
  "tenant-portal": { title: "My Property", subtitle: "Your home, lease, and quick actions." },
  "tenant-command-center": { title: "Dashboard", subtitle: "Your complete tenancy overview." },
  "tenant-lease": { title: "Lease", subtitle: "Your fully signed lease agreement." },
  "tenant-documents": { title: "Documents", subtitle: "Files related to your tenancy." },
  "tenant-payments": { title: "Payments", subtitle: "Your rent and payment history." },
  "browse-properties": { title: "Browse Properties", subtitle: "Find available properties to rent or book." },
  "my-bookings": { title: "My Bookings", subtitle: "Your reservations and lease agreements." },
  "tenant-inbox": { title: "Requests", subtitle: "All your requests and maintenance issues in one place." },
  "tenant-reports": { title: "Reports", subtitle: "Your full stay, payment, lease and maintenance history." },
  "maintenance-portal": { title: "Maintenance", subtitle: "Maintenance jobs created from tenant issues and assigned to vendors." },
  finance: { title: "Financial Intelligence", subtitle: "Financial intelligence across rent, expenses, and escrow." },
  properties: { title: "Properties", subtitle: "All your properties and their current status in one place." },
  tenants: { title: "Tenants", subtitle: "Tenants linked to each property and their lease/payment status." },
  reports: { title: "Reports", subtitle: "Downloadable reports across finance, maintenance, and reviews." },
  "manage-users": { title: "Manage Users", subtitle: "Add and manage landlords, tenants, maintenance, and consultants." },
  
  subscription: { title: "Subscription Plans", subtitle: "Manage your plan and unlock features." },
  settings: { title: "Settings", subtitle: "Your account, subscription, and preferences." },
  "pending-leases": { title: "Leases", subtitle: "All your lease agreements — pending and signed." },
  "property-detail": { title: "Property Details", subtitle: "View property information and booking." },
};

const Index = () => {
  const { profile, isAdmin, isConsultant, isLandlord, isMaintenance, isVendor, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const verifiedRef = useRef(false);
  const [navOpen, setNavOpen] = useState(false);
  const viewHistoryRef = useRef<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Track property detail for post-payment redirect
  const [detailPropertyId, setDetailPropertyId] = useState<string | null>(null);
  const [paymentSuccessPropertyId, setPaymentSuccessPropertyId] = useState<string | null>(null);

  const isManagerRole = isAdmin || isConsultant || isLandlord;
  const isMaintenanceOnly = (isMaintenance || isVendor) && !isManagerRole;
  const isLandlordOnly = isLandlord && !isAdmin && !isConsultant;

  const defaultView = isManagerRole
    ? "dashboard"
    : isMaintenanceOnly
    ? "maintenance-portal"
    : "tenant-command-center";
  const [currentView, setCurrentView] = useState(defaultView);

  // Check onboarding status
  useEffect(() => {
    if (profile && !(profile as any).onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [profile]);

  const navigateTo = useCallback((view: string) => {
    // Handle property detail navigation: "property-detail:uuid"
    if (view.startsWith("property-detail:") || view.startsWith("property-command:")) {
      const propId = view.split(":")[1];
      setDetailPropertyId(propId);
      setCurrentView(prev => {
        const targetView = view.startsWith("property-command:") ? "property-command" : "property-detail";
        if (prev !== targetView) {
          viewHistoryRef.current.push(prev);
        }
        return targetView;
      });
      return;
    }

    // Redirect deprecated/duplicate view ids to the unified entry views.
    let nextView = view;
    if (view === "properties") nextView = "dashboard";
    if (view === "tenant-documents" || view === "tenant-lease") nextView = "tenant-command-center";

    setDetailPropertyId(null);
    setCurrentView(prev => {
      if (prev !== nextView) {
        viewHistoryRef.current.push(prev);
      }
      return nextView;
    });
  }, []);

  const goBack = useCallback(() => {
    const history = viewHistoryRef.current;
    if (history.length > 0) {
      const prev = history.pop()!;
      setDetailPropertyId(null);
      setCurrentView(prev);
    }
  }, []);

  const goHome = useCallback(() => {
    viewHistoryRef.current = [];
    setDetailPropertyId(null);
    setCurrentView(defaultView);
  }, [defaultView]);

  // Landlord-only users skip the general dashboard.
  useEffect(() => {
    if (isLandlordOnly && currentView === "dashboard") {
      setCurrentView("properties");
    }
  }, [isLandlordOnly, currentView]);

  // Auto-verify rent payment on success redirect
  useEffect(() => {
    if (verifiedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const rentPayment = params.get("rent_payment");
    const sessionId = params.get("session_id");
    const returnPropertyId = params.get("property_id");

    if (rentPayment === "success" && sessionId) {
      verifiedRef.current = true;
      window.history.replaceState({}, "", window.location.pathname);

      // Navigate to the property detail page with payment success state
      if (returnPropertyId) {
        setPaymentSuccessPropertyId(returnPropertyId);
        setDetailPropertyId(returnPropertyId);
        setCurrentView("property-detail");
      }

      supabase.functions
        .invoke("verify-rent-payment", { body: { sessionId } })
        .then(({ data, error }) => {
          if (error) {
            console.error("Payment verification error:", error);
            toast({
              title: "Payment verification issue",
              description: "Your payment was processed but verification encountered an issue. It will be confirmed shortly.",
              variant: "destructive",
            });
          } else if (data?.verified) {
            toast({
              title: "Rent payment confirmed! ✅",
              description: "Your payment has been recorded and is now visible in your payment history.",
            });
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["tenant-lease"] });
            queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
          } else {
            toast({
              title: "Payment pending",
              description: "Your payment is still being processed. Please check back shortly.",
            });
          }
        });
    } else if (rentPayment === "canceled") {
      window.history.replaceState({}, "", window.location.pathname);
      toast({
        title: "Payment cancelled",
        description: "Your rent payment was not completed.",
      });
    }
  }, [toast, queryClient]);
  
  const viewInfo = viewTitles[currentView] || viewTitles.dashboard;

  const subtitle = currentView === "dashboard" && profile?.full_name
    ? `Welcome back, ${profile.full_name.split(" ")[0]}! Here's your overview.`
    : currentView === "tenant-portal" && profile?.full_name
    ? `Welcome, ${profile.full_name.split(" ")[0]}! Here's your rental information.`
    : viewInfo.subtitle;

  const renderContent = () => {
    switch (currentView) {
      case "manage-users":
        return isAdmin ? <AdminPanel defaultTab="users" /> : <LandlordUserManagement />;
      case "worker-performance":
        // Legacy route — Worker Performance now lives inside the Maintenance area.
        return <MaintenancePortal showPerformance={isManagerRole} />;
      case "subscription":
        if (!isManagerRole) return <TenantBrowseProperties />;
        return <SubscriptionPlans />;
      case "tenant-portal":
        return <TenantPortal />;
      case "tenant-command-center":
        return <TenantCommandCenter />;
      case "tenant-lease":
        return <TenantLeasePage />;
      case "tenant-documents":
        return <TenantCommandCenter defaultTab="documents" />;
      case "tenant-payments":
        return <TenantCommandCenter defaultTab="payments" />;
      case "browse-properties":
        return <TenantBrowseProperties />;
      case "my-bookings":
        return <MyBookingsPage />;
      case "tenant-inbox":
        return <TenantRequestsInbox />;
      case "tenant-reports":
        return <TenantReportsPage />;
      case "maintenance-portal":
        return <MaintenancePortal showPerformance={isManagerRole} />;
      case "finance":
        return <FinanceDashboard />;
      case "properties":
        return <PropertiesPage />;
      case "tenants":
        return <TenantsPage />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
      case "pending-leases":
        return <PendingLeasesPage />;
      case "property-detail":
      case "property-command":
        if (detailPropertyId) {
          if (currentView === "property-command" || isManagerRole) {
            return <PropertyCommandCenter propertyId={detailPropertyId} onBack={goBack} />;
          }
          return (
            <PropertyDetailView
              propertyId={detailPropertyId}
              onBack={goBack}
              paymentSuccess={paymentSuccessPropertyId === detailPropertyId}
            />
          );
        }
        return <Dashboard onNavigate={navigateTo} />;
      case "dashboard":
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
      <Sidebar
        currentView={currentView}
        onViewChange={navigateTo}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <Header
        title={viewInfo.title}
        subtitle={subtitle}
        onToggleNav={() => setNavOpen(!navOpen)}
        navOpen={navOpen}
        onNavigate={navigateTo}
        onGoBack={goBack}
        onGoHome={goHome}
      />
      <main className="max-w-[1760px] mx-auto px-4 md:px-6 py-6">
        {renderContent()}
      </main>
      <FeedbackButton />
      <TenantHelpWidget />
      <SessionTimeoutDialog />
    </div>
  );
};

export default Index;
