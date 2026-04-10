import { useState } from "react";
import { Building2, MapPin, Home, Search, Bed, Banknote, Wifi, ShieldCheck, Waves, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrowseProperties, BrowseProperty } from "@/hooks/useBrowseProperties";
import { PropertyDetailView } from "@/components/PropertyDetailView";
import { formatCurrency } from "@/lib/formatCurrency";
import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";

function PropertyBrowseCard({ property, onClick }: { property: BrowseProperty; onClick: () => void }) {
  const isAirbnb = property.listing_type === "airbnb";

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-card-hover group"
      onClick={onClick}
    >
      <div className="relative h-48 overflow-hidden bg-muted">
        {property.image_url ? (
          <img src={property.image_url} alt={property.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-slate">
            <Home className="h-12 w-12 text-primary-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {isAirbnb && (
            <Badge className="bg-accent text-accent-foreground text-xs">Airbnb</Badge>
          )}
          <Badge variant="outline" className="bg-card/80 backdrop-blur-sm text-xs capitalize">
            {property.property_type}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground truncate">{property.name}</h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{property.address}</span>
        </p>
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
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.address.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || p.listing_type === tab;
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-6 p-6">
      <VerificationStatusBanner />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Browse Properties</h2>
          <p className="text-sm text-muted-foreground">Find your next home or short stay</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({properties?.length || 0})</TabsTrigger>
          <TabsTrigger value="standard">Long-term ({properties?.filter((p) => p.listing_type === "standard").length || 0})</TabsTrigger>
          <TabsTrigger value="airbnb">Short Stay ({properties?.filter((p) => p.listing_type === "airbnb").length || 0})</TabsTrigger>
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
        </div>
      )}
    </div>
  );
}
