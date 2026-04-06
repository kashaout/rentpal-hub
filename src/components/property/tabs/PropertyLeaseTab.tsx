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

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/10 text-success border-success/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
};

export function PropertyLeaseTab({ propertyId }: Props) {
  const { data: leases, isLoading } = useQuery({
    queryKey: ["property-leases", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_agreements")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!leases?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No lease agreements found.</CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Signed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leases.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.tenant_name}</TableCell>
                <TableCell>{l.unit_number}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(l.lease_start), "MMM d, yyyy")} – {format(new Date(l.lease_end), "MMM d, yyyy")}
                </TableCell>
                <TableCell>{formatCurrency(Number(l.rent_amount), l.currency)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColor[l.status] || ""}>{l.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  T: {l.tenant_signed ? "✓" : "✗"} / L: {l.landlord_signed ? "✓" : "✗"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
