import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Banknote, Users, Home } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/hooks/useProperties";

interface Props {
  property: Property;
}

export function PropertyOverviewTab({ property }: Props) {
  const { data: stats } = useQuery({
    queryKey: ["property-overview-stats", property.id],
    queryFn: async () => {
      const [tenants, payments, issues] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("property_id", property.id),
        supabase.from("payments").select("amount, status").eq("status", "completed")
          .in("tenant_id", (await supabase.from("tenants").select("id").eq("property_id", property.id)).data?.map(t => t.id) || []),
        supabase.from("maintenance_requests").select("id", { count: "exact", head: true }).eq("property_id", property.id).eq("status", "pending"),
      ]);
      const totalRevenue = payments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      return {
        tenantCount: tenants.count || 0,
        totalRevenue,
        openIssues: issues.count || 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Units</p>
                <p className="text-2xl font-bold">{property.units}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tenants</p>
                <p className="text-2xl font-bold">{stats?.tenantCount ?? "–"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Banknote className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue ?? 0, property.currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Building2 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Issues</p>
                <p className="text-2xl font-bold">{stats?.openIssues ?? "–"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Property Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="flex items-center gap-1 font-medium"><MapPin className="h-4 w-4 text-muted-foreground" /> {property.address}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="font-medium">{formatCurrency(Number(property.monthly_rent), property.currency)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant="outline" className="capitalize">{property.property_type}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Listing Type</p>
              <Badge variant="outline" className="capitalize">{property.listing_type}</Badge>
            </div>
          </div>
          {property.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm mt-1">{property.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
