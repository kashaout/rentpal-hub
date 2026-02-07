import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { TenantPortal } from "@/components/tenant/TenantPortal";
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
import { useAuth } from "@/hooks/useAuth";

const viewTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Welcome back! Here's your overview." },
  "tenant-portal": { title: "My Portal", subtitle: "View your lease, payments, and submit requests." },
  "maintenance-portal": { title: "Maintenance", subtitle: "Manage repair requests and track work orders." },
  finance: { title: "Financial Intelligence", subtitle: "P&L, cashflow, ROI analytics and AI insights." },
  properties: { title: "Properties", subtitle: "Manage your rental properties." },
  tenants: { title: "Tenants", subtitle: "View and manage your tenants." },
  "issue-reports": { title: "Issue Reports", subtitle: "Track all maintenance issues and assignments." },
  compliance: { title: "Compliance Tracker", subtitle: "Monitor certifications, inspections, and legal requirements." },
  payments: { title: "Payments", subtitle: "Track rent and payment history." },
  reports: { title: "Reports", subtitle: "Analytics and performance metrics." },
  documents: { title: "Documents", subtitle: "Leases, contracts, and more." },
  "manage-users": { title: "Manage Users", subtitle: "Add and manage user accounts." },
  roles: { title: "Roles & Permissions", subtitle: "Configure access levels." },
  "worker-performance": { title: "Worker Performance", subtitle: "Track maintenance team metrics and ratings." },
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
      case "tenant-portal":
        return <TenantPortal />;
      case "maintenance-portal":
        return <MaintenancePortal />;
      case "finance":
        return <FinanceDashboard />;
      case "issue-reports":
        return <IssueReportingPage />;
      case "compliance":
        return <ComplianceDashboard />;
      case "payments":
        return <PaymentsPage />;
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
