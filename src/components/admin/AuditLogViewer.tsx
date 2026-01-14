import { useState } from "react";
import { useAuditLogs, AuditLogWithUser } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { Loader2, Shield, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const actionIcons = {
  INSERT: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
};

const actionColors = {
  INSERT: "bg-green-500/10 text-green-600 border-green-500/20",
  UPDATE: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
};

const tableLabels: Record<string, string> = {
  user_roles: "User Roles",
  payments: "Payments",
};

function JsonDiff({ oldData, newData, changedFields }: { 
  oldData: Record<string, unknown> | null; 
  newData: Record<string, unknown> | null;
  changedFields: string[] | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!oldData && !newData) return <span className="text-muted-foreground">No data</span>;

  const fields = changedFields || Object.keys(newData || oldData || {});

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
          {isOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
          {fields.length} field{fields.length !== 1 ? 's' : ''} changed
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="text-xs space-y-1 bg-muted/50 p-2 rounded-md max-w-md">
          {fields.map((field) => (
            <div key={field} className="flex gap-2">
              <span className="font-mono font-medium text-foreground">{field}:</span>
              {oldData && (
                <span className="text-red-500 line-through">
                  {JSON.stringify(oldData[field])}
                </span>
              )}
              {newData && (
                <span className="text-green-500">
                  {JSON.stringify(newData[field])}
                </span>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AuditLogViewer() {
  const [tableFilter, setTableFilter] = useState<string>("all");

  const { data: logs, isLoading } = useAuditLogs({
    tableName: tableFilter === "all" ? undefined : tableFilter,
    limit: 100,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Track changes to sensitive data</CardDescription>
            </div>
          </div>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by table" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              <SelectItem value="user_roles">User Roles</SelectItem>
              <SelectItem value="payments">Payments</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No audit logs found</p>
            <p className="text-sm">Changes to roles and payments will appear here</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                  <TableHead className="w-[120px]">Table</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead className="w-[180px]">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const ActionIcon = actionIcons[log.action];
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={actionColors[log.action]}>
                          <ActionIcon className="h-3 w-3 mr-1" />
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">
                          {tableLabels[log.table_name] || log.table_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <JsonDiff 
                          oldData={log.old_data as Record<string, unknown> | null} 
                          newData={log.new_data as Record<string, unknown> | null}
                          changedFields={log.changed_fields}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.user_email || (log.user_id ? "Unknown user" : "System")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
