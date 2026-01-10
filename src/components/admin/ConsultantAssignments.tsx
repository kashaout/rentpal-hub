import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus, Trash2, UserCog, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import {
  useConsultantAssignments,
  useConsultants,
  useAssignConsultant,
  useRemoveAssignment,
} from "@/hooks/useAdmin";
import { useProperties } from "@/hooks/useProperties";

export function ConsultantAssignments() {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: assignments, isLoading } = useConsultantAssignments();
  const { data: consultants } = useConsultants();
  const { data: properties } = useProperties();
  const assignConsultant = useAssignConsultant();
  const removeAssignment = useRemoveAssignment();

  const handleAssign = async () => {
    if (selectedConsultant && selectedProperty) {
      await assignConsultant.mutateAsync({
        consultantId: selectedConsultant,
        propertyId: selectedProperty,
      });
      setAssignDialogOpen(false);
      setSelectedConsultant("");
      setSelectedProperty("");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await removeAssignment.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  // Filter out already assigned combinations
  const getAvailableProperties = (consultantId: string) => {
    const assignedPropertyIds = assignments
      ?.filter((a) => a.consultant_id === consultantId)
      .map((a) => a.property_id);
    return properties?.filter((p) => !assignedPropertyIds?.includes(p.id));
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Consultant Assignments</h2>
          <p className="text-sm text-muted-foreground">
            Assign consultants to manage specific properties
          </p>
        </div>
        <Button onClick={() => setAssignDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Assign Consultant
        </Button>
      </div>

      {/* Assignments Table */}
      {assignments && assignments.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                        <UserCog className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">{assignment.consultant_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.consultant_email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{assignment.property_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.property_address}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(assignment.assigned_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <UserCog className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 font-medium text-foreground">No assignments yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign consultants to properties to give them management access.
          </p>
          <Button
            onClick={() => setAssignDialogOpen(true)}
            variant="outline"
            className="mt-4 gap-2"
          >
            <Plus className="h-4 w-4" />
            Assign Consultant
          </Button>
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Consultant to Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Consultant</Label>
              <Select
                value={selectedConsultant}
                onValueChange={setSelectedConsultant}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a consultant" />
                </SelectTrigger>
                <SelectContent>
                  {consultants?.map((consultant) => (
                    <SelectItem key={consultant.user_id} value={consultant.user_id}>
                      {consultant.full_name || consultant.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {consultants?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No consultants found. Add the consultant role to a user first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Property</Label>
              <Select
                value={selectedProperty}
                onValueChange={setSelectedProperty}
                disabled={!selectedConsultant}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableProperties(selectedConsultant)?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name} - {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={
                  !selectedConsultant ||
                  !selectedProperty ||
                  assignConsultant.isPending
                }
              >
                {assignConsultant.isPending ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this consultant assignment? The
              consultant will lose access to manage this property.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeAssignment.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
