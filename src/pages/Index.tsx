import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { LandlordUserManagement } from "@/components/admin/LandlordUserManagement";
import { TenantPortal } from "@/components/tenant/TenantPortal";
import { TenantCommandCenter } from "@/components/tenant/TenantCommandCenter";
import { TenantBrowseProperties } from "@/components/tenant/TenantBrowseProperties";
import { TenantRequestsInbox } from "@/components/tenant/TenantRequestsInbox";
import { MaintenancePortal } from "@/components/maintenance/MaintenancePortal";
import { PropertiesPage } from "@/components/PropertiesPage";
import { TenantsPage } from "@/components/TenantsPage";
import { SettingsPage } from "@/components/SettingsPage";
import { ReportsPage } from "@/components/ReportsPage";
import { MaintenancePerformanceDashboard } from "@/components/admin/MaintenancePerformanceDashboard";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import { SubscriptionPlans } from "@/components/subscription/SubscriptionPlans";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const viewTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Welcome back! Here's your overview." },
  "tenant-portal": { title: "My Portal", subtitle: "View your lease, payments, and submit requests." },
  "tenant-command-center": { title: "My Tenancy", subtitle: "Your complete tenancy dashboard." },
  "browse-properties": { title: "Browse Properties", subtitle: "Find available properties to rent or book." },
  "tenant-inbox": { title: "Inbox", subtitle: "All your requests and communication in one place." },
  "maintenance-portal": { title: "Maintenance", subtitle: "Manage repair requests and track work orders." },
  finance: { title: "Financial Intelligence", subtitle: "P&L, cashflow, ROI analytics and AI insights." },
  properties: { title: "Properties", subtitle: "Manage your rental properties." },
  tenants: { title: "Tenants", subtitle: "View and manage your tenants." },
  reports: { title: "Reports", subtitle: "Analytics and performance metrics." },
  "manage-users": { title: "Manage Users", subtitle: "Add and manage user accounts." },
  
  "worker-performance": { title: "Worker Performance", subtitle: "Track maintenance team metrics and ratings." },
  subscription: { title: "Subscription Plans", subtitle: "Manage your plan and unlock features." },
  settings: { title: "Settings", subtitle: "Configure your preferences." },
};

const Index = () => {
  const { profile, isTenant, isAdmin, isConsultant, isLandlord, isMaintenance, isVendor } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const verifiedRef = useRef(false);
  const [navOpen, setNavOpen] = useState(false);
  const viewHistoryRef = useRef<string[]>([]);
  
  const isTenantOnly = isTenant && !isAdmin && !isConsultant && !isLandlord && !isMaintenance && !isVendor;
  const isMaintenanceOnly = (isMaintenance || isVendor) && !isAdmin && !isConsultant && !isLandlord && !isTenant;
  const defaultView = isTenantOnly ? "tenant-portal" : isMaintenanceOnly ? "maintenance-portal" : "dashboard";
  const [currentView, setCurrentView] = useState(defaultView);

  const navigateTo = useCallback((view: string) => {
    setCurrentView(prev => {
      if (prev !== view) {
        viewHistoryRef.current.push(prev);
      }
      return view;
    });
  }, []);

  const goBack = useCallback(() => {
    const history = viewHistoryRef.current;
    if (history.length > 0) {
      const prev = history.pop()!;
      setCurrentView(prev);
    }
  }, []);

  const goHome = useCallback(() => {
    viewHistoryRef.current = [];
    setCurrentView(defaultView);
  }, [defaultView]);

  // Redirect tenant-only users away from landlord dashboard
  useEffect(() => {
    if (isTenantOnly && currentView === "dashboard") {
      setCurrentView("tenant-portal");
    }
  }, [isTenantOnly, currentView]);

  // Auto-verify rent payment on success redirect
  useEffect(() => {
    if (verifiedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const rentPayment = params.get("rent_payment");
    const sessionId = params.get("session_id");

    if (rentPayment === "success" && sessionId) {
      verifiedRef.current = true;
      window.history.replaceState({}, "", window.location.pathname);

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
        return <MaintenancePerformanceDashboard />;
      case "subscription":
        return <SubscriptionPlans />;
      case "tenant-portal":
        return <TenantPortal />;
      case "tenant-command-center":
        return <TenantCommandCenter />;
      case "browse-properties":
        return <TenantBrowseProperties />;
      case "tenant-inbox":
        return <TenantRequestsInbox />;
      case "maintenance-portal":
        return <MaintenancePortal />;
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
      case "dashboard":
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <Header
        title={viewInfo.title}
        subtitle={subtitle}
        onToggleNav={() => setNavOpen(!navOpen)}
        navOpen={navOpen}
        onNavigate={setCurrentView}
      />
      <main className="max-w-[1760px] mx-auto px-4 md:px-6 py-6">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
