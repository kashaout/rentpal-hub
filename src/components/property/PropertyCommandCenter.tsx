import { useState } from "react";
import { ArrowLeft, Loader2, Building2, Users, FileText, CreditCard, AlertTriangle, Wrench, FolderOpen, ShieldCheck, Activity, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProperty } from "@/hooks/useProperties";
import { PropertyOverviewTab } from "./tabs/PropertyOverviewTab";
import { PropertyTenantsTab } from "./tabs/PropertyTenantsTab";
import { PropertyLeaseTab } from "./tabs/PropertyLeaseTab";
import { PropertyPaymentsTab } from "./tabs/PropertyPaymentsTab";
import { PropertyIssuesTab } from "./tabs/PropertyIssuesTab";
import { PropertyWorkOrdersTab } from "./tabs/PropertyWorkOrdersTab";
import { PropertyDocumentsTab } from "./tabs/PropertyDocumentsTab";
import { PropertyComplianceTab } from "./tabs/PropertyComplianceTab";
import { PropertyActivityTab } from "./tabs/PropertyActivityTab";
import { PropertyReviewsTab } from "./tabs/PropertyReviewsTab";

interface PropertyCommandCenterProps {
  propertyId: string;
  onBack: () => void;
}

const TABS = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "tenants", label: "Tenants", icon: Users },
  { key: "lease", label: "Lease", icon: FileText },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "issues", label: "Issues", icon: AlertTriangle },
  { key: "work-orders", label: "Work Orders", icon: Wrench },
  { key: "documents", label: "Documents", icon: FolderOpen },
  { key: "compliance", label: "Compliance", icon: ShieldCheck },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "activity", label: "Activity", icon: Activity },
];

export function PropertyCommandCenter({ propertyId, onBack }: PropertyCommandCenterProps) {
  const { data: property, isLoading } = useProperty(propertyId);
  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Property not found.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{property.name}</h1>
          <p className="text-sm text-muted-foreground truncate">{property.address}</p>
        </div>
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
          <PropertyOverviewTab property={property} />
        </TabsContent>
        <TabsContent value="tenants">
          <PropertyTenantsTab propertyId={propertyId} />
        </TabsContent>
        <TabsContent value="lease">
          <PropertyLeaseTab propertyId={propertyId} />
        </TabsContent>
        <TabsContent value="payments">
          <PropertyPaymentsTab propertyId={propertyId} />
        </TabsContent>
        <TabsContent value="issues">
          <PropertyIssuesTab propertyId={propertyId} />
        </TabsContent>
        <TabsContent value="work-orders">
          <PropertyWorkOrdersTab propertyId={propertyId} />
        </TabsContent>
        <TabsContent value="documents">
          <PropertyDocumentsTab propertyId={propertyId} />
        </TabsContent>
        <TabsContent value="compliance">
          <PropertyComplianceTab propertyId={propertyId} />
        </TabsContent>
        <TabsContent value="reviews">
          <PropertyReviewsTab propertyId={propertyId} />
        </TabsContent>
        <TabsContent value="activity">
          <PropertyActivityTab propertyId={propertyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
