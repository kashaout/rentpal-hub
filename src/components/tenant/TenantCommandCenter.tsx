import { useState } from "react";
import { Loader2, Home, FileText, CreditCard, AlertTriangle, FolderOpen, MessageSquare, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenantLease } from "@/hooks/useTenantPortal";
import { Card, CardContent } from "@/components/ui/card";
import { TenantOverviewTab } from "./tabs/TenantOverviewTab";
import { TenantLeaseTab } from "./tabs/TenantLeaseTab";
import { TenantPaymentsTab } from "./tabs/TenantPaymentsTab";
import { TenantIssuesTab } from "./tabs/TenantIssuesTab";
import { TenantDocumentsTab } from "./tabs/TenantDocumentsTab";
import { TenantCommunicationTab } from "./tabs/TenantCommunicationTab";
import { TenantHistoryTab } from "./tabs/TenantHistoryTab";

const TABS = [
  { key: "overview", label: "Overview", icon: Home },
  { key: "lease", label: "Lease", icon: FileText },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "issues", label: "Issues", icon: AlertTriangle },
  { key: "documents", label: "Documents", icon: FolderOpen },
  { key: "communication", label: "Communication", icon: MessageSquare },
  { key: "history", label: "History", icon: History },
];

export function TenantCommandCenter({ defaultTab = "overview" }: { defaultTab?: string } = {}) {
  const { data: lease, isLoading } = useTenantLease();
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lease) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-lg font-medium">No Active Tenancy</p>
          <p className="text-sm text-muted-foreground mt-1">You don't have an active lease. Browse properties to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{lease.property_name}</h1>
        <p className="text-sm text-muted-foreground">{lease.property_address} • Unit {lease.unit_number}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto flex-nowrap sm:flex-wrap h-auto gap-1 bg-muted/50 p-1 justify-start">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background shrink-0"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview">
          <TenantOverviewTab lease={lease} />
        </TabsContent>
        <TabsContent value="lease">
          <TenantLeaseTab lease={lease} />
        </TabsContent>
        <TabsContent value="payments">
          <TenantPaymentsTab tenantId={lease.id} />
        </TabsContent>
        <TabsContent value="issues">
          <TenantIssuesTab tenantId={lease.id} propertyId={lease.property_id} />
        </TabsContent>
        <TabsContent value="documents">
          <TenantDocumentsTab propertyId={lease.property_id} />
        </TabsContent>
        <TabsContent value="communication">
          <TenantCommunicationTab propertyId={lease.property_id} />
        </TabsContent>
        <TabsContent value="history">
          <TenantHistoryTab tenantId={lease.id} propertyId={lease.property_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
