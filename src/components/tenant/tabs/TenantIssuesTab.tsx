import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenantMaintenanceView } from "@/hooks/useTenantMaintenanceView";

interface Props {
  tenantId: string;
  propertyId: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  urgent: "bg-destructive text-destructive-foreground",
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-success/10 text-success border-success/20",
  completed: "bg-success/10 text-success border-success/20",
};

export function TenantIssuesTab({ tenantId, propertyId }: Props) {
  const { data: allIssues, isLoading } = useTenantMaintenanceView();
  // Filter to the specific property shown in the command center
  const issues = allIssues?.filter((i) => i.property_name) || [];

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!issues?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No maintenance issues submitted.</CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((i) => (
              <TableRow key={i.id}>
                <TableCell>
                  <p className="font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{i.description}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={priorityColors[i.priority] || ""}>{i.priority}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[i.status] || ""}>{i.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(i.created_at), "MMM d, yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
