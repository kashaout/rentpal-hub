import { useState, useMemo } from "react";
import {
  Loader2, Home, FileText, CreditCard, AlertTriangle, FolderOpen,
  MessageSquare, History, Wifi, KeyRound, Lock, CheckCircle2, ShieldCheck,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenantLease } from "@/hooks/useTenantPortal";
import { useTenantBookedProperties } from "@/hooks/useTenantBookedProperties";
import { useTenantLeaseByProperty } from "@/hooks/useTenantLeaseByProperty";
import { useLeaseCredentials } from "@/hooks/useLeaseCredentials";
import { isWithinCredentialWindow } from "@/lib/bookingTime";
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

  // Credentials gate — only show within 12h of check-in (item #6).
  const credentialsAllowed = selectedProperty
    ? isWithinCredentialWindow(
        selectedProperty.check_in ?? selectedProperty.lease_start ?? "",
        selectedProperty.check_in_time
      )
    : false;
  const { data: credentials } = useLeaseCredentials(
    credentialsAllowed ? lease?.lease_id : undefined
  );

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

      {/* Access credentials reveal — gated by the 12-hour window before check-in.
          We only render this card when we can actually display codes. */}
      {credentialsAllowed && credentials && (credentials.wifi_password || credentials.keybox_password) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <p className="text-sm font-semibold">Access Codes Released</p>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">
                Within 12 hours of check-in
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {credentials.wifi_password && (
                <div className="rounded-lg border bg-background p-3">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <Wifi className="h-3 w-3" /> WiFi Password
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold break-all">
                    {credentials.wifi_password}
                  </p>
                </div>
              )}
              {credentials.keybox_password && (
                <div className="rounded-lg border bg-background p-3">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <KeyRound className="h-3 w-3" /> Door / Keybox Code
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold break-all">
                    {credentials.keybox_password}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* When the user has selected a property but credentials aren't released yet,
          give them a clear explanation so they know what to expect. */}
      {selectedProperty?.status === "current" && !credentialsAllowed && lease?.lease_id && (
        <Card className="border-dashed">
          <CardContent className="py-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            WiFi & door codes will appear here 12 hours before your check-in time.
          </CardContent>
        </Card>
      )}

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
