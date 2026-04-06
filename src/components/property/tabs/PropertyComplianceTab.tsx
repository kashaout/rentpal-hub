import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  propertyId: string;
}

const statusColors: Record<string, string> = {
  compliant: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  non_compliant: "bg-destructive/10 text-destructive border-destructive/20",
  not_applicable: "bg-muted text-muted-foreground",
};

export function PropertyComplianceTab({ propertyId }: Props) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["property-compliance", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_items")
        .select("*")
        .eq("property_id", propertyId)
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!items?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No compliance items tracked for this property.</CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium">{item.name}</p>
                  {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{item.category.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[item.status] || ""}>{item.status.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.expiry_date ? format(new Date(item.expiry_date), "MMM d, yyyy") : "–"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
