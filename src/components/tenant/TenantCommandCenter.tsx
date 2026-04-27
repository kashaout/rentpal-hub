import { useState, useMemo } from "react";
import {
  Loader2, Home, FileText, CreditCard, AlertTriangle, FolderOpen,
  MessageSquare, History, ShieldCheck,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenantLease } from "@/hooks/useTenantPortal";
import { useTenantBookedProperties } from "@/hooks/useTenantBookedProperties";
import { useTenantLeaseByProperty } from "@/hooks/useTenantLeaseByProperty";
import {
  TenantPropertySelector,
  pickDefaultProperty,
  PropertyHeaderInfo,
} from "./TenantPropertySelector";
import { TenantOverviewTab } from "./tabs/TenantOverviewTab";
import { TenantLeaseTab } from "./tabs/TenantLeaseTab";
import { TenantPaymentsTab } from "./tabs/TenantPaymentsTab";
import { TenantIssuesTab } from "./tabs/TenantIssuesTab";
import { TenantDocumentsTab } from "./tabs/TenantDocumentsTab";
import { TenantCommunicationTab } from "./tabs/TenantCommunicationTab";
import { TenantHistoryTab } from "./tabs/TenantHistoryTab";
import { TenantCodesTab } from "./tabs/TenantCodesTab";

const TABS = [
  { key: "overview", label: "Overview", icon: Home },
  { key: "lease", label: "Lease", icon: FileText },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "issues", label: "Issues", icon: AlertTriangle },
  { key: "documents", label: "Documents", icon: FolderOpen },
  { key: "codes", label: "Codes", icon: ShieldCheck },
  { key: "communication", label: "Communication", icon: MessageSquare },
  { key: "history", label: "History", icon: History },
];

export function TenantCommandCenter({ defaultTab = "overview" }: { defaultTab?: string } = {}) {
  // Fallback to the user's "active" lease if no property is explicitly selected.
  const { data: activeLease, isLoading: activeLoading } = useTenantLease();
  const { data: properties, isLoading: propsLoading } = useTenantBookedProperties();

  const [filter, setFilter] = useState<"current" | "past">("current");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(defaultTab);

  // The "effective" property — what the dashboard renders for.
  const effectivePropertyId = useMemo(() => {
    if (selectedPropertyId) return selectedPropertyId;
    return (
      pickDefaultProperty(properties, filter) ??
      activeLease?.property_id ??
      null
    );
  }, [selectedPropertyId, properties, filter, activeLease]);

  const { data: scopedLease, isLoading: scopedLoading } = useTenantLeaseByProperty(effectivePropertyId);

  // If selector lease matches the active lease, prefer the active payload (richer)
  const lease =
    activeLease && effectivePropertyId === activeLease.property_id ? activeLease : scopedLease;

  const selectedProperty = (properties ?? []).find((p) => p.property_id === effectivePropertyId);

  const isLoading = activeLoading || propsLoading || scopedLoading;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Brand-new user with no bookings or leases at all
  if (!properties?.length && !lease) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-lg font-medium">No tenancy yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Browse properties to make your first booking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <TenantPropertySelector
        selectedPropertyId={effectivePropertyId}
        onChange={setSelectedPropertyId}
        filter={filter}
        onFilterChange={(f) => {
          setFilter(f as any);
          setSelectedPropertyId(null);
        }}
      />

      <PropertyHeaderInfo property={selectedProperty} />

      {!lease ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No tenancy data is available for this property yet.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto flex-nowrap sm:flex-wrap h-auto gap-1 bg-muted/50 p-1 justify-start">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              // Disable Lease/Codes when no signed lease exists, but never hide
              // the tab — users need to see what's coming.
              const disabled =
                (tab.key === "lease" || tab.key === "codes") && !lease.lease_id;
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  disabled={disabled}
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
          <TabsContent value="codes">
            <TenantCodesTab leaseId={lease.lease_id} />
          </TabsContent>
          <TabsContent value="communication">
            <TenantCommunicationTab propertyId={lease.property_id} />
          </TabsContent>
          <TabsContent value="history">
            <TenantHistoryTab tenantId={lease.id} propertyId={lease.property_id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
