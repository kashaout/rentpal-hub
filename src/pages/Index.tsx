import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";

const viewTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Welcome back! Here's your overview." },
  properties: { title: "Properties", subtitle: "Manage your rental properties." },
  tenants: { title: "Tenants", subtitle: "View and manage your tenants." },
  payments: { title: "Payments", subtitle: "Track rent and payment history." },
  documents: { title: "Documents", subtitle: "Leases, contracts, and more." },
};

const Index = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const viewInfo = viewTitles[currentView] || viewTitles.dashboard;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-auto">
        <Header title={viewInfo.title} subtitle={viewInfo.subtitle} />
        <Dashboard />
      </main>
    </div>
  );
};

export default Index;
