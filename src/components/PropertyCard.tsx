import { MapPin, Users, DollarSign, MoreHorizontal, Pencil, Trash2, TrendingUp, TrendingDown, AlertTriangle, Wrench, Clock, ShieldCheck, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency } from "@/lib/formatCurrency";
import { usePropertyComplianceScore } from "@/hooks/useCompliance";

interface PropertyCardProps {
  property: PropertyWithStats;
  onEdit: (property: PropertyWithStats) => void;
  className?: string;
}

// Calculate ROI percentage
function calculateROI(annualIncome: number, acquisitionCost: number): number | null {
  if (!acquisitionCost || acquisitionCost === 0) return null;
  return ((annualIncome / acquisitionCost) * 100);
}

// Calculate profit/loss
function calculateProfitLoss(monthlyRent: number, annualExpenses: number): number {
  const annualRent = monthlyRent * 12;
  return annualRent - (annualExpenses || 0);
}

export function PropertyCard({ property, onEdit, className }: PropertyCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteProperty = useDeleteProperty();
  const { data: complianceScore } = usePropertyComplianceScore(property.id);

  const { 
    name, 
    address, 
    units, 
    occupied_units, 
    monthly_rent, 
    image_url, 
    currency,
    acquisition_cost,
    annual_expenses,
  } = property;
  
  const occupancyRate = units > 0 ? Math.round((occupied_units / units) * 100) : 0;
  const annualIncome = Number(monthly_rent) * 12;
  const roi = calculateROI(annualIncome, Number(acquisition_cost));
  const profitLoss = calculateProfitLoss(Number(monthly_rent), Number(annual_expenses));
  const isProfitable = profitLoss > 0;

  // Determine status badges
  const badges = [];

  if (property.listing_type === "airbnb") {
    badges.push({ label: "Airbnb", variant: "default" as const, icon: Home });
  }
  
  if (isProfitable) {
    badges.push({ label: "Profitable", variant: "success" as const, icon: TrendingUp });
  } else if (profitLoss < 0) {
    badges.push({ label: "Loss", variant: "destructive" as const, icon: TrendingDown });
  }
  
  if (occupancyRate < 50) {
    badges.push({ label: "High Vacancy", variant: "warning" as const, icon: AlertTriangle });
  }
  
  if (complianceScore !== undefined && complianceScore < 70) {
    badges.push({ label: "Compliance Risk", variant: "destructive" as const, icon: ShieldCheck });
  }

  const handleDelete = async () => {
    await deleteProperty.mutateAsync(property.id);
    setShowDeleteDialog(false);
  };

  const getVariantClasses = (variant: string) => {
    switch (variant) {
      case "success":
        return "bg-success/10 text-success border-success/20";
      case "destructive":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "warning":
        return "bg-warning/10 text-warning border-warning/20";
      case "default":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "";
    }
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
          
          {/* Status Badges */}
          {badges.length > 0 && (
            <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
              {badges.slice(0, 2).map((badge, index) => {
                const Icon = badge.icon;
                return (
                  <Badge
                    key={index}
                    variant="outline"
                    className={cn(
                      "gap-1 border text-xs font-medium shadow-sm backdrop-blur-sm",
                      getVariantClasses(badge.variant)
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {badge.label}
                  </Badge>
                );
              })}
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

          {/* Financial Summary */}
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {isProfitable ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={cn(
                "text-sm font-semibold",
                isProfitable ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(Math.abs(profitLoss), currency || "NGN")}/yr
              </span>
            </div>
            {roi !== null && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">ROI:</span>
                <span className={cn(
                  "text-sm font-semibold",
                  roi >= 10 ? "text-success" : roi >= 5 ? "text-warning" : "text-destructive"
                )}>
                  {roi.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

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
                {formatCurrency(Number(monthly_rent), currency || "NGN", true)}
              </p>
            </div>
          </div>

          {/* Compliance Score Indicator */}
          {complianceScore !== undefined && (
            <div className="mt-3 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">Compliance</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all",
                      complianceScore >= 90 ? "bg-success" :
                      complianceScore >= 70 ? "bg-primary" :
                      complianceScore >= 50 ? "bg-warning" : "bg-destructive"
                    )}
                    style={{ width: `${complianceScore}%` }}
                  />
                </div>
                <span className={cn(
                  "text-xs font-semibold",
                  complianceScore >= 90 ? "text-success" :
                  complianceScore >= 70 ? "text-primary" :
                  complianceScore >= 50 ? "text-warning" : "text-destructive"
                )}>
                  {complianceScore}%
                </span>
              </div>
            </div>
          )}
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
