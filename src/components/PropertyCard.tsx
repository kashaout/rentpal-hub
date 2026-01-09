import { MapPin, Users, DollarSign, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useState } from "react";
import { PropertyWithStats, useDeleteProperty } from "@/hooks/useProperties";

interface PropertyCardProps {
  property: PropertyWithStats;
  onEdit: (property: PropertyWithStats) => void;
  className?: string;
}

export function PropertyCard({ property, onEdit, className }: PropertyCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteProperty = useDeleteProperty();

  const { name, address, units, occupied_units, monthly_rent, image_url } = property;
  const occupancyRate = units > 0 ? Math.round((occupied_units / units) * 100) : 0;

  const handleDelete = async () => {
    await deleteProperty.mutateAsync(property.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div
        className={cn(
          "group overflow-hidden rounded-lg border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in",
          className
        )}
      >
        {/* Property Image */}
        <div className="relative h-40 overflow-hidden bg-muted">
          {image_url ? (
            <img
              src={image_url}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-slate">
              <MapPin className="h-10 w-10 text-primary-foreground/50" />
            </div>
          )}
          <div className="absolute right-2 top-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(property)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Property
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Property
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Property Info */}
        <div className="p-5">
          <h3 className="font-display text-lg font-semibold text-card-foreground">
            {name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {address}
          </p>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-md bg-secondary p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                Units
              </div>
              <p className="mt-1 text-sm font-semibold text-secondary-foreground">
                {occupied_units}/{units}
              </p>
            </div>
            <div className="rounded-md bg-secondary p-2.5 text-center">
              <div className="text-xs text-muted-foreground">Occupancy</div>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold",
                  occupancyRate >= 90
                    ? "text-success"
                    : occupancyRate >= 70
                    ? "text-warning"
                    : "text-destructive"
                )}
              >
                {occupancyRate}%
              </p>
            </div>
            <div className="rounded-md bg-secondary p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                Rent
              </div>
              <p className="mt-1 text-sm font-semibold text-secondary-foreground">
                ${Number(monthly_rent).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{name}"? This will also remove all associated tenants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProperty.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
