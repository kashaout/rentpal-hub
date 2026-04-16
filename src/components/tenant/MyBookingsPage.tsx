import { format } from "date-fns";
import { Calendar, Loader2, MapPin, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyBookings, useCancelBooking } from "@/hooks/useBookings";
import { useMyLeaseAgreements } from "@/hooks/useLeaseAgreements";
import { formatCurrency } from "@/lib/formatCurrency";
import { EmptyState } from "@/components/ui/empty-state";

const statusStyles: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-primary/10 text-primary border-primary/20",
};

export function MyBookingsPage() {
  const { data: bookings, isLoading: bookingsLoading } = useMyBookings();
  const { data: leases, isLoading: leasesLoading } = useMyLeaseAgreements();
  const cancelBooking = useCancelBooking();

  const isLoading = bookingsLoading || leasesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const activeBookings = bookings?.filter((b) => b.status !== "cancelled") || [];
  const activeLeases = leases?.filter((l) => l.status !== "cancelled") || [];

  if (activeBookings.length === 0 && activeLeases.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building2}
          title="No Bookings Yet"
          description="Browse properties and make a reservation to see your bookings here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {activeLeases.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Lease Agreements</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {activeLeases.map((lease) => (
              <Card key={lease.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{lease.tenant_name}</CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {lease.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Unit {lease.unit_number}</p>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(lease.lease_start), "MMM d, yyyy")} – {format(new Date(lease.lease_end), "MMM d, yyyy")}
                  </div>
                  <p className="font-medium">{formatCurrency(lease.rent_amount, lease.currency)}/mo</p>
                  <div className="flex gap-2 pt-1">
                    {lease.tenant_signed && <Badge className="bg-success/10 text-success text-xs">Tenant Signed</Badge>}
                    {lease.landlord_signed && <Badge className="bg-success/10 text-success text-xs">Landlord Signed</Badge>}
                    {!lease.landlord_signed && lease.tenant_signed && (
                      <Badge className="bg-warning/10 text-warning text-xs">Pending Landlord Signature</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeBookings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Bookings</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {activeBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Booking</CardTitle>
                    <Badge variant="outline" className={statusStyles[booking.status] || ""}>
                      {booking.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(booking.check_in), "MMM d, yyyy")} – {format(new Date(booking.check_out), "MMM d, yyyy")}
                  </div>
                  <p className="font-medium">₦{Number(booking.total_price).toLocaleString()}</p>
                  <Badge variant="outline" className="capitalize text-xs">{booking.payment_status}</Badge>
                  {booking.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => cancelBooking.mutate(booking.id)}
                      disabled={cancelBooking.isPending}
                    >
                      Cancel Booking
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
