import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { TenantPortal } from "@/components/tenant/TenantPortal";
import { TenantBrowseProperties } from "@/components/tenant/TenantBrowseProperties";
import { LeaseAgreementView } from "@/components/tenant/LeaseAgreementView";
import { TenantRequestsInbox } from "@/components/tenant/TenantRequestsInbox";
import { MaintenancePortal } from "@/components/maintenance/MaintenancePortal";
import { PaymentsPage } from "@/components/PaymentsPage";
import { PropertiesPage } from "@/components/PropertiesPage";
import { TenantsPage } from "@/components/TenantsPage";
import { DocumentsPage } from "@/components/DocumentsPage";
import { SettingsPage } from "@/components/SettingsPage";
import { ReportsPage } from "@/components/ReportsPage";
import { IssueReportingPage } from "@/components/IssueReportingPage";
import { MaintenancePerformanceDashboard } from "@/components/admin/MaintenancePerformanceDashboard";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import { ComplianceDashboard } from "@/components/compliance/ComplianceDashboard";
import { AutomationDashboard } from "@/components/automation/AutomationDashboard";
import { SubscriptionPlans } from "@/components/subscription/SubscriptionPlans";
import { WorkOrdersDashboard } from "@/components/workorders/WorkOrdersDashboard";
import { EscrowDisputesDashboard } from "@/components/escrow/EscrowDisputesDashboard";
import { useAuth } from "@/hooks/useAuth";

const viewTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Welcome back! Here's your overview." },
  "tenant-portal": { title: "My Portal", subtitle: "View your lease, payments, and submit requests." },
  "browse-properties": { title: "Browse Properties", subtitle: "Find available properties to rent or book." },
  "agreements": { title: "Lease Agreements", subtitle: "Review and sign your lease agreements." },
  "tenant-inbox": { title: "Inbox", subtitle: "All your requests and communication in one place." },
  "maintenance-portal": { title: "Maintenance", subtitle: "Manage repair requests and track work orders." },
  "work-orders": { title: "Work Orders", subtitle: "9-stage work order lifecycle with SLA tracking." },
  finance: { title: "Financial Intelligence", subtitle: "P&L, cashflow, ROI analytics and AI insights." },
  escrow: { title: "Escrow & Disputes", subtitle: "Manage escrow payments, payouts, and dispute resolution." },
  properties: { title: "Properties", subtitle: "Manage your rental properties." },
  tenants: { title: "Tenants", subtitle: "View and manage your tenants." },
  "issue-reports": { title: "Issue Reports", subtitle: "Track all maintenance issues and assignments." },
  compliance: { title: "Compliance Tracker", subtitle: "Monitor certifications, inspections, and legal requirements." },
  automation: { title: "Automation", subtitle: "Configure workflows for alerts and notifications." },
  payments: { title: "Payments", subtitle: "Track rent and payment history." },
  "reviews-page": { title: "Reviews", subtitle: "Property and service reviews from guests and hosts." },
  reports: { title: "Reports", subtitle: "Analytics and performance metrics." },
  documents: { title: "Documents", subtitle: "Leases, contracts, and more." },
  "manage-users": { title: "Manage Users", subtitle: "Add and manage user accounts." },
  roles: { title: "Roles & Permissions", subtitle: "Configure access levels." },
  "worker-performance": { title: "Worker Performance", subtitle: "Track maintenance team metrics and ratings." },
  subscription: { title: "Subscription Plans", subtitle: "Manage your plan and unlock features." },
  settings: { title: "Settings", subtitle: "Configure your preferences." },
};

const Index = () => {
  const { profile, isTenant, isAdmin, isConsultant, isLandlord, isMaintenance } = useAuth();
  
  // Default to appropriate portal based on role
  const isTenantOnly = isTenant && !isAdmin && !isConsultant && !isLandlord && !isMaintenance;
  const isMaintenanceOnly = isMaintenance && !isAdmin && !isConsultant && !isLandlord && !isTenant;
  const defaultView = isTenantOnly ? "tenant-portal" : isMaintenanceOnly ? "maintenance-portal" : "dashboard";
  const [currentView, setCurrentView] = useState(defaultView);
  
  const viewInfo = viewTitles[currentView] || viewTitles.dashboard;

  // Personalize subtitle
  const subtitle = currentView === "dashboard" && profile?.full_name
    ? `Welcome back, ${profile.full_name.split(" ")[0]}! Here's your overview.`
    : currentView === "tenant-portal" && profile?.full_name
    ? `Welcome, ${profile.full_name.split(" ")[0]}! Here's your rental information.`
    : viewInfo.subtitle;

  const renderContent = () => {
    switch (currentView) {
      case "manage-users":
      case "roles":
        return <AdminPanel defaultTab={currentView === "roles" ? "assignments" : "users"} />;
      case "worker-performance":
        return <MaintenancePerformanceDashboard />;
      case "subscription":
        return <SubscriptionPlans />;
      case "tenant-portal":
        return <TenantPortal />;
      case "browse-properties":
        return <TenantBrowseProperties />;
      case "agreements":
        return <LeaseAgreementView />;
      case "tenant-inbox":
        return <TenantRequestsInbox />;
      case "maintenance-portal":
        return <MaintenancePortal />;
      case "work-orders":
        return <WorkOrdersDashboard />;
      case "finance":
        return <FinanceDashboard />;
      case "escrow":
        return <EscrowDisputesDashboard />;
      case "issue-reports":
        return <IssueReportingPage />;
      case "compliance":
        return <ComplianceDashboard />;
      case "automation":
        return <AutomationDashboard />;
      case "payments":
        return <PaymentsPage />;
      case "reviews-page":
        return <ReportsPage />; /* TODO: dedicated reviews page */
      case "properties":
        return <PropertiesPage />;
      case "tenants":
        return <TenantsPage />;
      case "documents":
        return <DocumentsPage />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
      case "dashboard":
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-auto">
        <Header title={viewInfo.title} subtitle={subtitle} />
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
