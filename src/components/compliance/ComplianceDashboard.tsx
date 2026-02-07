import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useComplianceItems, 
  calculateComplianceScore,
  CATEGORY_LABELS,
  ComplianceCategory,
} from "@/hooks/useCompliance";
import { useProperties } from "@/hooks/useProperties";
import { ComplianceTable } from "./ComplianceTable";
import { ComplianceScoreBadge } from "./ComplianceScoreBadge";
import { ComplianceItemFormDialog } from "./ComplianceItemFormDialog";
import { 
  Plus, 
  Loader2, 
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
} from "lucide-react";

export function ComplianceDashboard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const propertyFilter = selectedProperty === "all" ? undefined : selectedProperty;
  const { data: items, isLoading } = useComplianceItems(propertyFilter);
  const { data: properties } = useProperties();

  // Filter by category
  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (selectedCategory === "all") return items;
    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!items) return { score: 100, compliant: 0, pending: 0, expired: 0, expiringSoon: 0 };

    const score = calculateComplianceScore(items);
    const compliant = items.filter((i) => i.status === "compliant").length;
    const pending = items.filter((i) => i.status === "pending").length;
    const expired = items.filter((i) => i.status === "expired" || i.status === "non_compliant").length;
    const expiringSoon = items.filter(
      (i) => i.days_until_expiry !== null && i.days_until_expiry > 0 && i.days_until_expiry <= 30
    ).length;

    return { score, compliant, pending, expired, expiringSoon };
  }, [items]);

  // Group items by status for tabs
  const groupedItems = useMemo(() => {
    if (!filteredItems) return { all: [], expiring: [], issues: [] };

    const expiring = filteredItems.filter(
      (i) => i.days_until_expiry !== null && i.days_until_expiry <= 30
    );
    const issues = filteredItems.filter(
      (i) => i.status === "expired" || i.status === "non_compliant" || i.status === "pending"
    );

    return { all: filteredItems, expiring, issues };
  }, [filteredItems]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Compliance Tracker
          </h1>
          <p className="text-muted-foreground">
            Monitor safety certificates, inspections, and legal requirements
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Compliance Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Compliance Score</p>
              <ComplianceScoreBadge score={stats.score} size="sm" showLabel={false} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Compliant</p>
              <p className="text-2xl font-bold">{stats.compliant}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Issues</p>
              <p className="text-2xl font-bold">{stats.expired}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <Clock className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
              <p className="text-2xl font-bold">{stats.expiringSoon}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <div className="flex flex-wrap gap-3">
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Items Table with Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Items ({groupedItems.all.length})
          </TabsTrigger>
          <TabsTrigger value="expiring" className="gap-1">
            Expiring Soon
            {groupedItems.expiring.length > 0 && (
              <span className="ml-1 rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">
                {groupedItems.expiring.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-1">
            Issues
            {groupedItems.issues.length > 0 && (
              <span className="ml-1 rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">
                {groupedItems.issues.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ComplianceTable items={groupedItems.all} showProperty={selectedProperty === "all"} />
        </TabsContent>

        <TabsContent value="expiring">
          <ComplianceTable items={groupedItems.expiring} showProperty={selectedProperty === "all"} />
        </TabsContent>

        <TabsContent value="issues">
          <ComplianceTable items={groupedItems.issues} showProperty={selectedProperty === "all"} />
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <ComplianceItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        propertyId={selectedProperty !== "all" ? selectedProperty : undefined}
      />
    </div>
  );
}
