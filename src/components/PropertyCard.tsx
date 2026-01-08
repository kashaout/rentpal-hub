import { MapPin, Users, DollarSign, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PropertyCardProps {
  id: string;
  name: string;
  address: string;
  units: number;
  occupiedUnits: number;
  monthlyRent: number;
  image?: string;
  className?: string;
}

export function PropertyCard({
  name,
  address,
  units,
  occupiedUnits,
  monthlyRent,
  image,
  className,
}: PropertyCardProps) {
  const occupancyRate = Math.round((occupiedUnits / units) * 100);

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-lg border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in",
        className
      )}
    >
      {/* Property Image */}
      <div className="relative h-40 overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
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
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit Property</DropdownMenuItem>
              <DropdownMenuItem>Manage Tenants</DropdownMenuItem>
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
              {occupiedUnits}/{units}
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
              ${monthlyRent.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
