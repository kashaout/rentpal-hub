import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { formatCurrency } from "@/lib/formatCurrency";

const severityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  emergency: "bg-destructive text-destructive-foreground",
};

export function ExpensesTab() {
  const { data: workOrders, isLoading } = useWorkOrders();

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const totalEstimated = (workOrders || []).reduce((sum, wo) => sum + Number(wo.estimated_cost || 0), 0);
  const totalActual = (workOrders || []).reduce((sum, wo) => sum + Number(wo.actual_cost || 0), 0);
  const openOrders = (workOrders || []).filter(wo => !["closed", "completed", "verified"].includes(wo.status));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Estimated Costs</p>
            <p className="text-2xl font-bold text-warning">{formatCurrency(totalEstimated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Actual Costs</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalActual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Open Work Orders</p>
            <p className="text-2xl font-bold">{openOrders.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Maintenance Expenses (Work Orders)</CardTitle></CardHeader>
        <CardContent>
          {!workOrders?.length ? (
            <p className="text-muted-foreground text-center py-8">No work orders recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Estimated</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead>Labour (hrs)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders.map(wo => (
                  <TableRow key={wo.id}>
                    <TableCell>{format(new Date(wo.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">{wo.property_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={severityColors[wo.severity] || ""}>
                        {wo.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{wo.status.replace("_", " ")}</TableCell>
                    <TableCell className="text-right">{wo.estimated_cost ? formatCurrency(wo.estimated_cost) : "—"}</TableCell>
                    <TableCell className="text-right">{wo.actual_cost ? formatCurrency(wo.actual_cost) : "—"}</TableCell>
                    <TableCell>{wo.labor_hours || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
