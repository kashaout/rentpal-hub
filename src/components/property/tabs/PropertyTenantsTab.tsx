import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatCurrency";

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

      return data.map(t => ({ ...t, tenant_name: profileMap[t.user_id || ""] || "Unknown" }));
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((t) => (
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
