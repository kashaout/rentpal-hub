import { useState } from "react";
import { Building2, Plus, Search, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyFormDialog } from "@/components/PropertyFormDialog";
import { useProperties, PropertyWithStats } from "@/hooks/useProperties";

export function PropertiesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithStats | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");

  const { data: properties, isLoading } = useProperties();

  const handleEdit = (property: PropertyWithStats) => {
    setEditingProperty(property);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingProperty(undefined);
  };

  // Filter and sort properties
  const filteredProperties = properties
    ?.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rent":
          return Number(b.monthly_rent) - Number(a.monthly_rent);
        case "occupancy":
          const occA = a.units > 0 ? a.occupied_units / a.units : 0;
          const occB = b.units > 0 ? b.occupied_units / b.units : 0;
          return occB - occA;
        case "units":
          return b.units - a.units;
        default:
          return 0;
      }
    });

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
          onClick={() => setDialogOpen(true)}
          className="gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Properties Grid */}
      {filteredProperties && filteredProperties.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/50 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            {searchQuery ? "No properties found" : "No properties yet"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search query."
              : "Add your first property to get started."}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setDialogOpen(true)}
              className="mt-4 gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          )}
        </div>
      )}

      {/* Dialog */}
      <PropertyFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        property={editingProperty}
      />
    </div>
  );
}
