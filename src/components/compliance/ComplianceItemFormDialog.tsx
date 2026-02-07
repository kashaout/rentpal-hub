import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateComplianceItem,
  useUpdateComplianceItem,
  ComplianceItemWithProperty,
  ComplianceCategory,
  ComplianceStatus,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "@/hooks/useCompliance";
import { useProperties } from "@/hooks/useProperties";
import { Loader2 } from "lucide-react";

interface ComplianceItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ComplianceItemWithProperty;
  propertyId?: string;
}

export function ComplianceItemFormDialog({
  open,
  onOpenChange,
  item,
  propertyId,
}: ComplianceItemFormDialogProps) {
  const { data: properties } = useProperties();
  const createMutation = useCreateComplianceItem();
  const updateMutation = useUpdateComplianceItem();

  const [formData, setFormData] = useState({
    property_id: propertyId || "",
    category: "tenancy_agreement" as ComplianceCategory,
    name: "",
    description: "",
    status: "pending" as ComplianceStatus,
    issue_date: "",
    expiry_date: "",
    reminder_days: 30,
    notes: "",
    last_inspection_date: "",
    next_inspection_date: "",
    inspector_name: "",
  });

  useEffect(() => {
    if (item) {
      setFormData({
        property_id: item.property_id,
        category: item.category,
        name: item.name,
        description: item.description || "",
        status: item.status,
        issue_date: item.issue_date || "",
        expiry_date: item.expiry_date || "",
        reminder_days: item.reminder_days,
        notes: item.notes || "",
        last_inspection_date: item.last_inspection_date || "",
        next_inspection_date: item.next_inspection_date || "",
        inspector_name: item.inspector_name || "",
      });
    } else {
      setFormData({
        property_id: propertyId || "",
        category: "tenancy_agreement",
        name: "",
        description: "",
        status: "pending",
        issue_date: "",
        expiry_date: "",
        reminder_days: 30,
        notes: "",
        last_inspection_date: "",
        next_inspection_date: "",
        inspector_name: "",
      });
    }
  }, [item, propertyId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      issue_date: formData.issue_date || undefined,
      expiry_date: formData.expiry_date || undefined,
      last_inspection_date: formData.last_inspection_date || undefined,
      next_inspection_date: formData.next_inspection_date || undefined,
      description: formData.description || undefined,
      notes: formData.notes || undefined,
      inspector_name: formData.inspector_name || undefined,
    };

    if (item) {
      await updateMutation.mutateAsync({ id: item.id, ...submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
    onOpenChange(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit Compliance Item" : "Add Compliance Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!propertyId && (
            <div className="space-y-2">
              <Label htmlFor="property">Property *</Label>
              <Select
                value={formData.property_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, property_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as ComplianceCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as ComplianceStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Certificate of Occupancy"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of this compliance item"
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) =>
                  setFormData({ ...formData, issue_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) =>
                  setFormData({ ...formData, expiry_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="last_inspection_date">Last Inspection</Label>
              <Input
                id="last_inspection_date"
                type="date"
                value={formData.last_inspection_date}
                onChange={(e) =>
                  setFormData({ ...formData, last_inspection_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_inspection_date">Next Inspection</Label>
              <Input
                id="next_inspection_date"
                type="date"
                value={formData.next_inspection_date}
                onChange={(e) =>
                  setFormData({ ...formData, next_inspection_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reminder_days">Reminder (days before expiry)</Label>
              <Input
                id="reminder_days"
                type="number"
                min={1}
                max={365}
                value={formData.reminder_days}
                onChange={(e) =>
                  setFormData({ ...formData, reminder_days: parseInt(e.target.value) || 30 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspector_name">Inspector Name</Label>
              <Input
                id="inspector_name"
                value={formData.inspector_name}
                onChange={(e) =>
                  setFormData({ ...formData, inspector_name: e.target.value })
                }
                placeholder="Inspector name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.property_id || !formData.name}
              className="bg-gradient-warm text-accent-foreground"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {item ? "Update" : "Add"} Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
