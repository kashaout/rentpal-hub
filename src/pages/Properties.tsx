import { useState, useMemo, forwardRef } from "react";
import { Link } from "react-router-dom";
import { Building2, Search, MapPin, Loader2, ArrowRight, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatCurrency";
import logoImg from "@/assets/rentpal-logo.png";

interface PublicProperty {
  id: string;
  name: string;
  address: string;
  description: string | null;
  image_url: string | null;
  property_type: string;
  listing_type: string;
  monthly_rent: number;
  currency: string;
  units: number;
  region: string;
  amenities: any[];
  landlord_business_name?: string | null;
}

function usePublicProperties() {
  return useQuery({
    queryKey: ["public-properties-page"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_property_listings" as any, {
        _property_id: null,
      });
      if (error) throw error;
      return ((data as any[]) || []) as PublicProperty[];
    },
    staleTime: 60_000,
  });
}

const Properties = forwardRef<HTMLDivElement>(function Properties(_props, _ref) {
  const [search, setSearch] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const { data: properties = [], isLoading } = usePublicProperties();

  // Derive unique values for filters
  const { propertyTypes, companyNames } = useMemo(() => {
    const types = new Set<string>();
    const companies = new Set<string>();
    properties.forEach((p) => {
      if (p.property_type) types.add(p.property_type);
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

  const filtered = properties.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.property_type.toLowerCase().includes(q) ||
      (p.landlord_business_name || "").toLowerCase().includes(q);
    const matchType = propertyTypeFilter === "all" || p.property_type === propertyTypeFilter;
    const matchCompany =
      companyFilter === "all" || p.landlord_business_name === companyFilter;
    return matchSearch && matchType && matchCompany;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="RentPal" className="h-8 w-8 object-contain" />
            <span className="font-display text-lg font-bold">RentPal</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="outline" size="sm">Log In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-1.5">
                Sign Up <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b bg-primary/5 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Find Your Perfect Home
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Browse verified properties across Nigeria. Sign up to book your next home.
          </p>
          <div className="mx-auto mt-6 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, location, type, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative shrink-0"
              aria-label="Toggle filters"
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="mx-auto mt-4 flex max-w-xl flex-wrap items-end gap-3 rounded-lg border bg-card p-4 text-left">
              <div className="space-y-1.5 min-w-[160px] flex-1">
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
              <div className="space-y-1.5 min-w-[180px] flex-1">
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
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Listings */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {isLoading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No properties available"
            description={search || activeFilterCount > 0 ? "Try a different search or clear filters." : "Check back soon for new listings."}
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "property" : "properties"} available
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((property) => (
                <Card key={property.id} className="overflow-hidden hover:shadow-card transition-shadow">
                  <div className="relative aspect-video bg-muted">
                    {property.image_url ? (
                      <img
                        src={property.image_url}
                        alt={property.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Building2 className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <Badge className="absolute top-3 left-3 capitalize">
                      {property.listing_type}
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-foreground line-clamp-1">{property.name}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{property.address}</span>
                    </div>
                    {property.landlord_business_name && (
                      <p className="text-xs text-muted-foreground">
                        by <span className="font-medium text-foreground">{property.landlord_business_name}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(property.monthly_rent, property.currency)}
                        <span className="text-xs font-normal text-muted-foreground">
                          /{property.listing_type === "airbnb" ? "night" : "month"}
                        </span>
                      </p>
                      <Badge variant="outline" className="capitalize text-xs">
                        {property.property_type}
                      </Badge>
                    </div>
                    <Link to="/auth" className="block pt-2">
                      <Button className="w-full gap-1.5" size="sm">
                        Sign Up to Book <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} RentPal. All rights reserved.</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
});

export default Properties;
