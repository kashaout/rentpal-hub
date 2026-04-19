import { useTenantBookedProperties, TenantBookedProperty } from "@/hooks/useTenantBookedProperties";
import { Building2, Loader2, MapPin, CalendarRange } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface PropertySelectorProps {
  selectedPropertyId: string | null;
  onChange: (propertyId: string | null) => void;
  filter: "current" | "past" | "all";
  onFilterChange: (filter: "current" | "past" | "all") => void;
  /** When true, the user can pick "all" instead of a specific property. */
  allowAll?: boolean;
}

/**
 * Reusable filter bar for the tenant Dashboard and Reports pages.
 * Drives content scoping based on the tenant's current/past booked properties.
 */
export function TenantPropertySelector({
  selectedPropertyId,
  onChange,
  filter,
  onFilterChange,
  allowAll,
}: PropertySelectorProps) {
  const { data: properties, isLoading } = useTenantBookedProperties();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your properties…
      </div>
    );
  }

  const filtered = (properties ?? []).filter((p) =>
    filter === "all" ? true : p.status === filter
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs value={filter} onValueChange={(v) => onFilterChange(v as any)}>
        <TabsList>
          <TabsTrigger value="current" className="gap-1">
            Current
            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">
              {(properties ?? []).filter((p) => p.status === "current").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-1">
            Past
            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">
              {(properties ?? []).filter((p) => p.status === "past").length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Select
        value={selectedPropertyId ?? (allowAll ? "__all__" : "")}
        onValueChange={(v) => onChange(v === "__all__" ? null : v)}
        disabled={filtered.length === 0}
      >
        <SelectTrigger className="w-full sm:w-[280px]">
          <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder={filtered.length ? "Select property" : "No properties"} />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value="__all__">All {filter} properties</SelectItem>}
          {filtered.map((p) => (
            <SelectItem key={p.property_id} value={p.property_id}>
              <div className="flex flex-col">
                <span className="font-medium">{p.property_name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" />
                  {p.property_address}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Convenience: pick the first matching property when nothing is selected. */
export function pickDefaultProperty(
  properties: TenantBookedProperty[] | undefined,
  filter: "current" | "past" | "all"
): string | null {
  if (!properties?.length) return null;
  const inFilter = properties.filter((p) =>
    filter === "all" ? true : p.status === filter
  );
  return inFilter[0]?.property_id ?? properties[0].property_id;
}

export function PropertyHeaderInfo({ property }: { property: TenantBookedProperty | undefined }) {
  if (!property) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <div className="h-12 w-12 overflow-hidden rounded-lg bg-muted flex items-center justify-center shrink-0">
        {property.image_url ? (
          <img src={property.image_url} alt={property.property_name} className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold truncate">{property.property_name}</h2>
          <Badge
            variant="outline"
            className={
              property.status === "current"
                ? "bg-success/10 text-success border-success/20"
                : "bg-muted text-muted-foreground"
            }
          >
            {property.status === "current" ? "Currently staying" : "Past stay"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3" />
          {property.property_address}
        </p>
        {(property.lease_start || property.check_in) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <CalendarRange className="h-3 w-3" />
            {property.lease_start ?? property.check_in} → {property.lease_end ?? property.check_out}
          </p>
        )}
      </div>
    </div>
  );
}
