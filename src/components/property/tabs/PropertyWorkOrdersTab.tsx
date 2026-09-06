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

const statusColors: Record<string, string> = {
  created: "bg-muted text-muted-foreground",
  assigned: "bg-primary/10 text-primary border-primary/20",
  in_progress: "bg-accent/10 text-accent border-accent/20",
  completed: "bg-success/10 text-success border-success/20",
  closed: "bg-muted text-muted-foreground",
  verified: "bg-success/10 text-success border-success/20",
};

export function PropertyWorkOrdersTab({ propertyId }: Props) {
  const { data: workOrders, isLoading } = useQuery({
    queryKey: ["property-work-orders", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, maintenance_requests(title)")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!workOrders?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No work orders for this property.</CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((wo) => (
              <TableRow key={wo.id}>
                <TableCell className="font-medium">
                  {wo.maintenance_requests?.title || "Work Order"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{wo.severity}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[wo.status] || ""}>{wo.status.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell>{wo.actual_cost ? formatCurrency(Number(wo.actual_cost), "NGN") : wo.estimated_cost ? formatCurrency(Number(wo.estimated_cost), "NGN") + " (est)" : "–"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(wo.created_at), "MMM d, yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
