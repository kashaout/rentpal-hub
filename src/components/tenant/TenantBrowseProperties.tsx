import { useState, useMemo } from "react";
import { Building2, MapPin, Home, Search, Loader2, Filter, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useBrowseProperties, BrowseProperty } from "@/hooks/useBrowseProperties";
import { PropertyDetailView } from "@/components/PropertyDetailView";
import { formatCurrency } from "@/lib/formatCurrency";
import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";
import { cn } from "@/lib/utils";

function PropertyBrowseCard({ property, onClick }: { property: BrowseProperty; onClick: () => void }) {
  const isAirbnb = property.listing_type === "airbnb";
  const isOccupied = property.is_paused;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 group",
        isOccupied
          ? "opacity-60 cursor-not-allowed"
          : "cursor-pointer hover:shadow-card-hover"
      )}
      onClick={isOccupied ? undefined : onClick}
    >
      <div className="relative h-48 overflow-hidden bg-muted">
        {property.image_url ? (
          <img
            src={property.image_url}
            alt={property.name}
            className={cn(
              "h-full w-full object-cover transition-transform duration-300",
              !isOccupied && "group-hover:scale-105",
              isOccupied && "grayscale"
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-slate">
            <Home className="h-12 w-12 text-primary-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {isAirbnb && (
            <Badge className="bg-accent text-accent-foreground text-xs">AirBnB</Badge>
          )}
          <Badge variant="outline" className="bg-card/80 backdrop-blur-sm text-xs capitalize">
            {property.property_type}
          </Badge>
        </div>
        {isOccupied && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
            <Badge className="bg-destructive text-destructive-foreground text-sm px-3 py-1">
              Occupied
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground truncate">{property.name}</h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{property.address}</span>
        </p>
        {property.landlord_business_name && (
          <p className="text-xs text-muted-foreground">
            by <span className="font-medium text-foreground">{property.landlord_business_name}</span>
          </p>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-bold text-foreground">
            {formatCurrency(property.monthly_rent, property.currency, true)}
          </span>
          <span className="text-xs text-muted-foreground">
            {isAirbnb ? "/ night" : "/ month"}
          </span>
        </div>
        {property.amenities.length > 0 && (
          <div className="flex gap-1 flex-wrap pt-1">
            {property.amenities.slice(0, 4).map((a) => (
              <Badge key={a} variant="secondary" className="text-xs capitalize">{a}</Badge>
            ))}
            {property.amenities.length > 4 && (
              <Badge variant="secondary" className="text-xs">+{property.amenities.length - 4}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TenantBrowseProperties() {
  const { data: properties, isLoading } = useBrowseProperties();
  const [search, setSearch] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Derive unique property types and company names
  const { propertyTypes, companyNames } = useMemo(() => {
    const types = new Set<string>();
    const companies = new Set<string>();
    (properties || []).forEach((p) => {
      types.add(p.property_type);
      if (p.landlord_business_name) companies.add(p.landlord_business_name);
    });
    return {
      propertyTypes: Array.from(types).sort(),
      companyNames: Array.from(companies).sort(),
    };
  }, [properties]);

  const activeFilterCount = [
    propertyTypeFilter !== "all",
    companyFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setPropertyTypeFilter("all");
    setCompanyFilter("all");
  };

  if (selectedPropertyId) {
    return (
      <PropertyDetailView
        propertyId={selectedPropertyId}
        onBack={() => setSelectedPropertyId(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const filtered = (properties || []).filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      (p.landlord_business_name || "").toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || p.listing_type === tab;
    const matchType = propertyTypeFilter === "all" || p.property_type === propertyTypeFilter;
    const matchCompany =
      companyFilter === "all" || p.landlord_business_name === companyFilter;
    return matchSearch && matchTab && matchType && matchCompany;
  });

  return (
    <div className="space-y-6 p-6">
      <VerificationStatusBanner />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Browse Properties</h2>
          <p className="text-sm text-muted-foreground">Find your next home or short stay</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties, companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="relative shrink-0"
          >
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 items-end p-4 rounded-lg border bg-muted/30">
          <div className="space-y-1.5 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground">Property Type</label>
            <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {propertyTypes.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Company</label>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companyNames.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({properties?.length || 0})</TabsTrigger>
          <TabsTrigger value="standard">Standard ({properties?.filter((p) => p.listing_type === "standard").length || 0})</TabsTrigger>
          <TabsTrigger value="airbnb">AirBnB ({properties?.filter((p) => p.listing_type === "airbnb").length || 0})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((property) => (
            <PropertyBrowseCard
              key={property.id}
              property={property}
              onClick={() => setSelectedPropertyId(property.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">No properties found.</p>
          {activeFilterCount > 0 && (
            <Button variant="link" onClick={clearFilters} className="mt-2 text-accent">
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
