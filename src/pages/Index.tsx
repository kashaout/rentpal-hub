import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { SessionTimeoutDialog } from "@/components/SessionTimeoutDialog";
import { Header } from "@/components/Header";
import { FeedbackButton } from "@/components/FeedbackButton";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { DevSecurityPanel } from "@/components/dev/DevSecurityPanel";
import { TenantHelpWidget } from "@/components/tenant/TenantHelpWidget";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { IdentityWizard } from "@/components/IdentityWizard";

// View-level code splitting: only the view the user actually opens is fetched.
const Dashboard = lazy(() => import("@/components/Dashboard").then(m => ({ default: m.Dashboard })));
const AdminPanel = lazy(() => import("@/components/admin/AdminPanel").then(m => ({ default: m.AdminPanel })));
const LandlordUserManagement = lazy(() => import("@/components/admin/LandlordUserManagement").then(m => ({ default: m.LandlordUserManagement })));
const TenantPortal = lazy(() => import("@/components/tenant/TenantPortal").then(m => ({ default: m.TenantPortal })));
const TenantCommandCenter = lazy(() => import("@/components/tenant/TenantCommandCenter").then(m => ({ default: m.TenantCommandCenter })));
const TenantBrowseProperties = lazy(() => import("@/components/tenant/TenantBrowseProperties").then(m => ({ default: m.TenantBrowseProperties })));
const MyBookingsPage = lazy(() => import("@/components/tenant/MyBookingsPage").then(m => ({ default: m.MyBookingsPage })));
const TenantRequestsInbox = lazy(() => import("@/components/tenant/TenantRequestsInbox").then(m => ({ default: m.TenantRequestsInbox })));
const MaintenancePortal = lazy(() => import("@/components/maintenance/MaintenancePortal").then(m => ({ default: m.MaintenancePortal })));
const PropertiesPage = lazy(() => import("@/components/PropertiesPage").then(m => ({ default: m.PropertiesPage })));
const TenantsPage = lazy(() => import("@/components/TenantsPage").then(m => ({ default: m.TenantsPage })));
const SettingsPage = lazy(() => import("@/components/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ReportsPage = lazy(() => import("@/components/ReportsPage").then(m => ({ default: m.ReportsPage })));
const FinanceDashboard = lazy(() => import("@/components/finance/FinanceDashboard").then(m => ({ default: m.FinanceDashboard })));
const SubscriptionPlans = lazy(() => import("@/components/subscription/SubscriptionPlans").then(m => ({ default: m.SubscriptionPlans })));
const PendingLeasesPage = lazy(() => import("@/components/PendingLeasesPage").then(m => ({ default: m.PendingLeasesPage })));
const PropertyDetailView = lazy(() => import("@/components/PropertyDetailView").then(m => ({ default: m.PropertyDetailView })));
const PropertyCommandCenter = lazy(() => import("@/components/property/PropertyCommandCenter").then(m => ({ default: m.PropertyCommandCenter })));
const TenantReportsPage = lazy(() => import("@/components/tenant/TenantReportsPage").then(m => ({ default: m.TenantReportsPage })));

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function ViewFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="sr-only">Loading view</span>
    </div>
  );
}


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
  const [showIdentity, setShowIdentity] = useState(false);
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
    : "browse-properties";
  const [currentView, setCurrentView] = useState(defaultView);
  // Track whether the user has explicitly navigated. While they have not,
  // keep the current view in sync with the role-derived default so that
  // roles arriving asynchronously (e.g. just after signup/login) do not
  // leave the user staring at a blank tenant view when they are actually
  // a landlord/admin.
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (!hasNavigatedRef.current) {
      setCurrentView(defaultView);
    }
  }, [defaultView]);

  // Check onboarding + identity status
  useEffect(() => {
    if (!profile) return;
    if (!(profile as any).onboarding_completed) {
      setShowOnboarding(true);
    } else if (!(profile as any).identity_complete) {
      setShowIdentity(true);
    }
  }, [profile]);

  const navigateTo = useCallback((view: string) => {
    hasNavigatedRef.current = true;
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

  // (Landlord/manager unification: Dashboard is the single entry point. The
  // legacy redirect from "dashboard" → "properties" has been removed.)

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
      // Legacy ids: Documents and Lease are now tabs inside TenantCommandCenter.
      case "tenant-lease":
        return <TenantCommandCenter defaultTab="lease" />;
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
      // Legacy id: Properties is unified under Dashboard for managers.
      case "properties":
        return isLandlordOnly ? <PropertiesPage /> : <Dashboard onNavigate={navigateTo} />;
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
        // Landlord-only users land on the property hub (which opens the
        // PropertyCommandCenter on click). Admins/consultants see the
        // analytics Dashboard.
        return isLandlordOnly ? <PropertiesPage /> : <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <EmailVerificationBanner />
      {showOnboarding && (
        <OnboardingWizard onComplete={() => {
          setShowOnboarding(false);
          if (profile && !(profile as any).identity_complete) setShowIdentity(true);
        }} />
      )}
      {!showOnboarding && showIdentity && (
        <IdentityWizard onComplete={() => setShowIdentity(false)} />
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
      <DevSecurityPanel />
    </div>
  );
};

export default Index;
