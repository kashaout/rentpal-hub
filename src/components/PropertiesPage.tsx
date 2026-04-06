import { useState } from "react";
import { Building2, Plus, Search, Filter, Loader2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PropertyCommandCenter } from "@/components/property/PropertyCommandCenter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyFormDialog } from "@/components/PropertyFormDialog";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { useProperties, PropertyWithStats } from "@/hooks/useProperties";
import { useSubscriptionContext } from "@/hooks/useSubscriptionContext";

export function PropertiesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithStats | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const { canAddProperty, isReadOnly } = useSubscriptionContext();

  const { data: properties, isLoading } = useProperties();

  // If a property is selected, show command center
  if (selectedPropertyId) {
    return (
      <PropertyCommandCenter
        propertyId={selectedPropertyId}
        onBack={() => setSelectedPropertyId(null)}
      />
    );
  }

  const handleEdit = (property: PropertyWithStats) => {
    setEditingProperty(property);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingProperty(undefined);
  };

  const sortProperties = (list: PropertyWithStats[]) =>
    list.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rent":
          return Number(b.monthly_rent) - Number(a.monthly_rent);
        case "occupancy": {
          const occA = a.units > 0 ? a.occupied_units / a.units : 0;
          const occB = b.units > 0 ? b.occupied_units / b.units : 0;
          return occB - occA;
        }
        case "units":
          return b.units - a.units;
        default:
          return 0;
      }
    });

  const filtered = properties?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const standardProperties = sortProperties(
    [...(filtered?.filter((p) => p.listing_type !== "airbnb") || [])]
  );
  const airbnbProperties = sortProperties(
    [...(filtered?.filter((p) => p.listing_type === "airbnb") || [])]
  );

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  const renderGrid = (list: PropertyWithStats[], emptyLabel: string) =>
    list.length > 0 ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((property) => (
          <PropertyCard key={property.id} property={property} onEdit={handleEdit} onClick={(p) => setSelectedPropertyId(p.id)} />
        ))}
      </div>
    ) : (
      <div className="rounded-lg border border-dashed bg-muted/50 p-12 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium text-foreground">
          {searchQuery ? "No properties found" : emptyLabel}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {searchQuery ? "Try adjusting your search query." : "Add your first property to get started."}
        </p>
        {!searchQuery && (
          <Button onClick={() => setDialogOpen(true)} className="mt-4 gap-2" variant="outline">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        )}
      </div>
    );

  return (
    <div className="space-y-6 p-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="rent">Highest Rent</SelectItem>
              <SelectItem value="occupancy">Occupancy Rate</SelectItem>
              <SelectItem value="units">Most Units</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            if (isReadOnly) return;
            if (!canAddProperty) {
              setUpgradeOpen(true);
              return;
            }
            setDialogOpen(true);
          }}
          className="gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90"
          disabled={isReadOnly}
        >
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="standard" className="w-full">
        <TabsList>
          <TabsTrigger value="standard" className="gap-2">
            <Building2 className="h-4 w-4" />
            Standard ({standardProperties.length})
          </TabsTrigger>
          <TabsTrigger value="airbnb" className="gap-2">
            <Home className="h-4 w-4" />
            Airbnb ({airbnbProperties.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="standard" className="mt-4">
          {renderGrid(standardProperties, "No standard properties yet")}
        </TabsContent>
        <TabsContent value="airbnb" className="mt-4">
          {renderGrid(airbnbProperties, "No Airbnb properties yet")}
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <PropertyFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        property={editingProperty}
      />
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason="property_limit" />
    </div>
  );
}
