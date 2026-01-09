import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { useAuth } from "@/hooks/useAuth";

const viewTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Welcome back! Here's your overview." },
  properties: { title: "Properties", subtitle: "Manage your rental properties." },
  tenants: { title: "Tenants", subtitle: "View and manage your tenants." },
  payments: { title: "Payments", subtitle: "Track rent and payment history." },
  documents: { title: "Documents", subtitle: "Leases, contracts, and more." },
  "manage-users": { title: "Manage Users", subtitle: "Add and manage user accounts." },
  roles: { title: "Roles & Permissions", subtitle: "Configure access levels." },
  settings: { title: "Settings", subtitle: "Configure your preferences." },
};

const Index = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const { profile, roles } = useAuth();
  const viewInfo = viewTitles[currentView] || viewTitles.dashboard;

  // Personalize subtitle
  const subtitle = currentView === "dashboard" && profile?.full_name
    ? `Welcome back, ${profile.full_name.split(" ")[0]}! Here's your overview.`
    : viewInfo.subtitle;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-auto">
        <Header title={viewInfo.title} subtitle={subtitle} />
        <Dashboard />
      </main>
    </div>
  );
};

export default Index;
