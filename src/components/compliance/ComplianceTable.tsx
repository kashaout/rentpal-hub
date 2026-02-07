import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ComplianceItemWithProperty, 
  CATEGORY_LABELS,
  useDeleteComplianceItem,
} from "@/hooks/useCompliance";
import { ComplianceStatusBadge } from "./ComplianceStatusBadge";
import { ComplianceItemFormDialog } from "./ComplianceItemFormDialog";
import { MoreHorizontal, Pencil, Trash2, Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface ComplianceTableProps {
  items: ComplianceItemWithProperty[];
  showProperty?: boolean;
}

export function ComplianceTable({ items, showProperty = true }: ComplianceTableProps) {
  const [editingItem, setEditingItem] = useState<ComplianceItemWithProperty | undefined>();
  const [deletingItem, setDeletingItem] = useState<ComplianceItemWithProperty | undefined>();
  const deleteMutation = useDeleteComplianceItem();

  const handleDelete = async () => {
    if (deletingItem) {
      await deleteMutation.mutateAsync(deletingItem.id);
      setDeletingItem(undefined);
    }
  };

  const getExpiryBadge = (daysUntilExpiry: number | null) => {
    if (daysUntilExpiry === null) return null;
    
    if (daysUntilExpiry < 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired {Math.abs(daysUntilExpiry)}d ago
        </Badge>
      );
    } else if (daysUntilExpiry <= 30) {
      return (
        <Badge variant="outline" className="gap-1 border-warning/50 text-warning">
          <Calendar className="h-3 w-3" />
          {daysUntilExpiry}d left
        </Badge>
      );
    } else if (daysUntilExpiry <= 90) {
      return (
        <Badge variant="outline" className="gap-1">
          <Calendar className="h-3 w-3" />
          {daysUntilExpiry}d left
        </Badge>
      );
    }
    return null;
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
        <p className="text-muted-foreground">No compliance items found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {showProperty && <TableHead>Property</TableHead>}
              <TableHead>Category</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                {showProperty && (
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.property_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {item.property_address}
                      </p>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {item.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <ComplianceStatusBadge status={item.status} size="sm" />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {item.expiry_date ? (
                      <>
                        <span className="text-sm">
                          {format(new Date(item.expiry_date), "MMM d, yyyy")}
                        </span>
                        {getExpiryBadge(item.days_until_expiry)}
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">No expiry</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingItem(item)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingItem(item)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ComplianceItemFormDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(undefined)}
        item={editingItem}
      />

      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Compliance Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
