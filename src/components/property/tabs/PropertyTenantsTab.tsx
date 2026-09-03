import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatCurrency";
import { CheckoutDialog } from "@/components/tenant/CheckoutDialog";

interface Props {
  propertyId: string;
}

export function PropertyTenantsTab({ propertyId }: Props) {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["property-tenants", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("property_id", propertyId)
        .order("lease_start", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set(data.map(t => t.user_id).filter(Boolean))] as string[];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name || "Unknown"]));
      }

      // Resolve the live lease per tenant so checkout targets the canonical lease row
      const { data: leases } = await supabase
        .from("lease_agreements")
        .select("id, tenant_user_id, checked_out_at, status")
        .eq("property_id", propertyId);
      const leaseMap: Record<string, any> = {};
      for (const l of leases ?? []) {
        if (!leaseMap[l.tenant_user_id] || (!l.checked_out_at && l.status !== "ended")) {
          leaseMap[l.tenant_user_id] = l;
        }
      }

      return data.map(t => ({
        ...t,
        tenant_name: profileMap[t.user_id || ""] || "Unknown",
        lease: t.user_id ? leaseMap[t.user_id] ?? null : null,
      }));
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!tenants?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No tenants for this property yet.</CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Lease Period</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Occupancy</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((t: any) => {
              const isActive = !t.is_archived && t.lease && !t.lease.checked_out_at && t.lease.status !== "ended";
              return (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.tenant_name}</TableCell>
                <TableCell>{t.unit_number}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(t.lease_start), "MMM d, yyyy")} – {format(new Date(t.lease_end), "MMM d, yyyy")}
                </TableCell>
                <TableCell>{formatCurrency(Number(t.rent_amount), "NGN")}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={t.payment_status === "paid" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}>
                    {t.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={isActive ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"}>
                    {isActive ? "Occupying" : "Checked out"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {isActive && (
                    <CheckoutDialog
                      leaseId={t.lease.id}
                      tenantName={t.tenant_name}
                      label="Checkout"
                    />
                  )}
                </TableCell>
              </TableRow>
            );})}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
