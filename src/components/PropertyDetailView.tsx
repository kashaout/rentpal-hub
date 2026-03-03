import { useState, useMemo } from "react";
import { format, eachDayOfInterval, parseISO, differenceInDays, addDays, isWithinInterval, isBefore, startOfDay } from "date-fns";
import {
  MapPin, Users, DollarSign, Star, Wifi, Car, Coffee, Utensils,
  Waves, Dumbbell, ShieldCheck, Wind, Tv, Bath, Bed, ArrowLeft,
  CalendarIcon, Home, Loader2, Clock, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProperty } from "@/hooks/useProperties";
import { usePropertyBookings, useCreateBooking } from "@/hooks/useBookings";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatCurrency";
import { useToast } from "@/hooks/use-toast";

const AMENITY_ICONS: Record<string, any> = {
  wifi: Wifi, parking: Car, coffee: Coffee, kitchen: Utensils,
  pool: Waves, gym: Dumbbell, security: ShieldCheck, ac: Wind,
  tv: Tv, bathroom: Bath, bedroom: Bed,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: "Free WiFi", parking: "Free Parking", coffee: "Coffee Maker",
  kitchen: "Full Kitchen", pool: "Swimming Pool", gym: "Fitness Center",
  security: "24/7 Security", ac: "Air Conditioning", tv: "Smart TV",
  bathroom: "Private Bathroom", bedroom: "King Bed",
};

interface PropertyDetailViewProps {
  propertyId: string;
  onBack: () => void;
}

export function PropertyDetailView({ propertyId, onBack }: PropertyDetailViewProps) {
  const { data: property, isLoading } = useProperty(propertyId);
  const { data: bookings } = usePropertyBookings(propertyId);
  const createBooking = useCreateBooking();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedRange, setSelectedRange] = useState<{ from?: Date; to?: Date }>({});
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState("");

  // Get booked date ranges
  const bookedDates = useMemo(() => {
    if (!bookings) return [];
    return bookings.flatMap((b) => {
      try {
        const start = parseISO(b.check_in);
        const end = parseISO(b.check_out);
        return eachDayOfInterval({ start, end });
      } catch {
        return [];
      }
    });
  }, [bookings]);

  const isDateBooked = (date: Date) => {
    return bookedDates.some(
      (d) => d.toDateString() === date.toDateString()
    );
  };

  const nightCount = selectedRange.from && selectedRange.to
    ? differenceInDays(selectedRange.to, selectedRange.from)
    : 0;

  const totalPrice = property
    ? nightCount * Number(property.monthly_rent)
    : 0;

  const handleBook = async () => {
    if (!selectedRange.from || !selectedRange.to || !property) return;

    if (nightCount < 1) {
      toast({ title: "Please select at least one night", variant: "destructive" });
      return;
    }

    await createBooking.mutateAsync({
      property_id: property.id,
      check_in: format(selectedRange.from, "yyyy-MM-dd"),
      check_out: format(selectedRange.to, "yyyy-MM-dd"),
      total_price: totalPrice,
      guest_count: guestCount,
      notes: notes || undefined,
    });

    setSelectedRange({});
    setNotes("");
    setGuestCount(1);
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Property not found.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const amenities = (property.amenities as string[]) || [];
  const isAirbnb = property.listing_type === "airbnb";
  const currency = property.currency || "NGN";

  return (
    <div className="space-y-6 p-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Properties
      </Button>

      {/* Hero Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Image */}
          <div className="relative h-64 sm:h-80 overflow-hidden rounded-xl bg-muted">
            {property.image_url ? (
              <img
                src={property.image_url}
                alt={property.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-slate">
                <Home className="h-16 w-16 text-primary-foreground/30" />
              </div>
            )}
            <div className="absolute top-3 left-3 flex gap-2">
              {isAirbnb && (
                <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm">
                  <Home className="mr-1 h-3 w-3" />
                  Airbnb
                </Badge>
              )}
              <Badge variant="outline" className="bg-card/80 backdrop-blur-sm">
                {property.property_type}
              </Badge>
            </div>
          </div>

          {/* Title & Location */}
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              {property.name}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {property.address}
            </p>
            {property.description && (
              <p className="mt-4 text-foreground/80 leading-relaxed">
                {property.description}
              </p>
            )}
          </div>

          <Separator />

          {/* Key Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-secondary p-4 text-center">
              <Bed className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Units</p>
              <p className="text-lg font-bold text-foreground">{property.units}</p>
            </div>
            <div className="rounded-lg bg-secondary p-4 text-center">
              <DollarSign className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {isAirbnb ? "Per Night" : "Monthly"}
              </p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(Number(property.monthly_rent), currency, true)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary p-4 text-center">
              <MapPin className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Region</p>
              <p className="text-lg font-bold text-foreground">{property.region}</p>
            </div>
            <div className="rounded-lg bg-secondary p-4 text-center">
              <Home className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Type</p>
              <p className="text-lg font-bold text-foreground capitalize">{property.listing_type}</p>
            </div>
          </div>

          <Separator />

          {/* Amenities */}
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              What this place offers
            </h2>
            {amenities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {amenities.map((amenity) => {
                  const Icon = AMENITY_ICONS[amenity] || Star;
                  const label = AMENITY_LABELS[amenity] || amenity;
                  return (
                    <div
                      key={amenity}
                      className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-sm text-foreground">{label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No amenities listed yet.</p>
            )}
          </div>

          {isAirbnb && (
            <>
              <Separator />

              {/* Availability Calendar */}
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Availability
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Select your check-in and check-out dates. Greyed out dates are unavailable.
                </p>
                <div className="flex justify-center">
                  <Calendar
                    mode="range"
                    selected={selectedRange as any}
                    onSelect={(range: any) => setSelectedRange(range || {})}
                    disabled={(date) =>
                      isBefore(date, startOfDay(new Date())) || isDateBooked(date)
                    }
                    numberOfMonths={2}
                    className="rounded-lg border p-3 pointer-events-auto"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Booking Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-2 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(Number(property.monthly_rent), currency)}
                </span>
                <span className="text-muted-foreground">
                  {isAirbnb ? "/ night" : "/ month"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAirbnb ? (
                <>
                  {/* Date Selection Summary */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground uppercase">Check-in</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedRange.from ? format(selectedRange.from, "MMM d, yyyy") : "Select date"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground uppercase">Check-out</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedRange.to ? format(selectedRange.to, "MMM d, yyyy") : "Select date"}
                      </p>
                    </div>
                  </div>

                  {/* Guests */}
                  <div>
                    <Label className="text-sm">Guests</Label>
                    <Input
                      type="number"
                      min={1}
                      max={property.units * 2}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="text-sm">Special Requests (optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special requests..."
                      className="mt-1 h-20"
                    />
                  </div>

                  {/* Price Breakdown */}
                  {nightCount > 0 && (
                    <div className="space-y-2 rounded-lg bg-secondary p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {formatCurrency(Number(property.monthly_rent), currency)} × {nightCount} night{nightCount > 1 ? "s" : ""}
                        </span>
                        <span className="text-foreground font-medium">
                          {formatCurrency(totalPrice, currency)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>Total</span>
                        <span>{formatCurrency(totalPrice, currency)}</span>
                      </div>
                    </div>
                  )}

                  {/* Book Button */}
                  <Button
                    onClick={handleBook}
                    disabled={!selectedRange.from || !selectedRange.to || nightCount < 1 || createBooking.isPending}
                    className="w-full bg-gradient-warm text-accent-foreground hover:opacity-90 h-12 text-base"
                  >
                    {createBooking.isPending ? "Booking..." : "Reserve"}
                  </Button>

                  {/* Payment Warning */}
                  <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 p-3">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                    <p className="text-xs text-warning">
                      Payment must be completed within 24 hours or the booking will be automatically released.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Standard Rental */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" />
                      Annual rent: {formatCurrency(Number(property.monthly_rent) * 12, currency)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {property.units} unit{property.units > 1 ? "s" : ""} available
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gradient-warm text-accent-foreground hover:opacity-90 h-12 text-base"
                    onClick={() =>
                      toast({ title: "Contact the landlord to arrange a lease for this property." })
                    }
                  >
                    Enquire to Rent
                  </Button>
                </>
              )}

              <p className="text-center text-xs text-muted-foreground">
                You won't be charged yet
              </p>
            </CardContent>
          </Card>

          {/* Existing Bookings for this property */}
          {isAirbnb && bookings && bookings.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-md bg-secondary p-2 text-xs"
                  >
                    <span className="text-foreground">
                      {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d")}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        booking.payment_status === "paid"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      )}
                    >
                      {booking.payment_status === "paid" ? "Confirmed" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
