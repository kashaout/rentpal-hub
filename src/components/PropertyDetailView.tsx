import { useState, useMemo } from "react";
import { format, eachDayOfInterval, parseISO, differenceInDays, isBefore, startOfDay, addMonths } from "date-fns";
import {
  MapPin, Users, DollarSign, Star, Wifi, Car, Coffee, Utensils,
  Waves, Dumbbell, ShieldCheck, Wind, Tv, Bath, Bed, ArrowLeft,
  CalendarIcon, Home, Loader2, Clock, AlertTriangle, ArrowRight,
  CheckCircle2, Pen, FileText, CreditCard
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
import { useCreateLeaseAgreement, useSignLeaseAgreement, useLeaseAgreementByProperty } from "@/hooks/useLeaseAgreements";
import { formatCurrency } from "@/lib/formatCurrency";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

type RentalStep = "browse" | "dates" | "details" | "contract" | "payment";

const STEPS: { key: RentalStep; label: string; icon: any }[] = [
  { key: "dates", label: "Dates", icon: CalendarIcon },
  { key: "details", label: "Details", icon: Users },
  { key: "contract", label: "Contract", icon: FileText },
  { key: "payment", label: "Payment", icon: CreditCard },
];

interface PropertyDetailViewProps {
  propertyId: string;
  onBack: () => void;
}

export function PropertyDetailView({ propertyId, onBack }: PropertyDetailViewProps) {
  const { data: property, isLoading } = useProperty(propertyId);
  const { data: bookings } = usePropertyBookings(propertyId);
  const createBooking = useCreateBooking();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const createAgreement = useCreateLeaseAgreement();
  const signAgreement = useSignLeaseAgreement();

  // Rental flow state
  const [rentalStep, setRentalStep] = useState<RentalStep>("browse");
  const [selectedRange, setSelectedRange] = useState<{ from?: Date; to?: Date }>({});
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [unitNumber, setUnitNumber] = useState("1");
  const [specialRequests, setSpecialRequests] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [idType, setIdType] = useState("passport");
  const [createdAgreementId, setCreatedAgreementId] = useState<string | null>(null);
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

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
    return bookedDates.some((d) => d.toDateString() === date.toDateString());
  };

  const nightCount = selectedRange.from && selectedRange.to
    ? differenceInDays(selectedRange.to, selectedRange.from)
    : 0;

  const isAirbnb = property?.listing_type === "airbnb";
  const currency = property?.currency || "NGN";

  // For standard: monthly rent × months
  const monthCount = selectedRange.from && selectedRange.to
    ? Math.max(1, Math.round(nightCount / 30))
    : 0;
  const standardTotal = property ? monthCount * Number(property.monthly_rent) : 0;
  const airbnbTotal = property ? nightCount * Number(property.monthly_rent) : 0;
  const totalPrice = isAirbnb ? airbnbTotal : standardTotal;

  const handleBook = async () => {
    if (!selectedRange.from || !selectedRange.to || !property) return;
    if (isAirbnb && nightCount < 1) {
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

  const handleCreateAndSignContract = async () => {
    if (!property || !user || !selectedRange.from || !selectedRange.to) return;

    try {
      const agreement = await createAgreement.mutateAsync({
        property_id: property.id,
        tenant_user_id: user.id,
        landlord_user_id: property.landlord_id || user.id,
        tenant_name: fullName || profile?.full_name || user.email || "Tenant",
        landlord_name: "Landlord",
        unit_number: unitNumber,
        rent_amount: Number(property.monthly_rent),
        currency: property.currency || "NGN",
        lease_start: format(selectedRange.from, "yyyy-MM-dd"),
        lease_end: format(selectedRange.to, "yyyy-MM-dd"),
        terms: `LEASE AGREEMENT\n\nThis Lease Agreement is entered into between the Landlord and ${fullName || "Tenant"} for the property "${property.name}" located at ${property.address}, Unit ${unitNumber}.\n\n1. TERM: The lease shall commence on ${format(selectedRange.from, "MMMM d, yyyy")} and terminate on ${format(selectedRange.to, "MMMM d, yyyy")}.\n\n2. RENT: The monthly rent shall be ${formatCurrency(Number(property.monthly_rent), property.currency || "NGN")}. Total for the lease period: ${formatCurrency(totalPrice, property.currency || "NGN")}.\n\n3. SECURITY DEPOSIT: A security deposit equivalent to one month's rent may be required.\n\n4. MAINTENANCE: Tenant shall report any maintenance issues promptly through the portal.\n\n5. TERMINATION: Either party may terminate this agreement with 30 days written notice.\n\n6. GOVERNING LAW: This agreement shall be governed by the laws of the jurisdiction where the property is located.`,
      });

      setCreatedAgreementId(agreement.id);

      // Tenant auto-signs
      await signAgreement.mutateAsync({ agreementId: agreement.id, role: "tenant" });
      setAgreementSigned(true);
      setRentalStep("payment");
    } catch (error) {
      // Error toast already handled by hooks
    }
  };

  const handlePayment = async () => {
    if (!property || !user) return;
    setPaymentLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-rent-payment", {
        body: {
          amount: totalPrice,
          currency: property.currency || "NGN",
          tenantId: user.id,
          propertyName: property.name,
          unitNumber: unitNumber,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
    } finally {
      setPaymentLoading(false);
    }
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

  // Render the standard rental wizard sidebar
  const renderStandardSidebar = () => {
    if (rentalStep === "browse") {
      return (
        <>
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
            className="w-full bg-gradient-warm text-accent-foreground hover:opacity-90 h-12 text-base gap-2"
            onClick={() => setRentalStep("dates")}
          >
            Rent <ArrowRight className="h-4 w-4" />
          </Button>
        </>
      );
    }

    // Step indicator
    const currentStepIndex = STEPS.findIndex((s) => s.key === rentalStep);

    return (
      <div className="space-y-4">
        {/* Step Progress */}
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : isDone ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn("text-[10px]", isActive ? "text-foreground font-medium" : "text-muted-foreground")}>{step.label}</span>
              </div>
            );
          })}
        </div>

        <Separator />

        {rentalStep === "dates" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select your lease start and end dates:</p>
            <Calendar
              mode="range"
              selected={selectedRange as any}
              onSelect={(range: any) => setSelectedRange(range || {})}
              disabled={(date) => isBefore(date, startOfDay(new Date()))}
              numberOfMonths={1}
              className="rounded-lg border p-3 pointer-events-auto"
            />
            {selectedRange.from && selectedRange.to && (
              <div className="rounded-lg bg-secondary p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start</span>
                  <span className="font-medium text-foreground">{format(selectedRange.from, "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End</span>
                  <span className="font-medium text-foreground">{format(selectedRange.to, "MMM d, yyyy")}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium text-foreground">{monthCount} month{monthCount > 1 ? "s" : ""}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-foreground">{formatCurrency(standardTotal, currency)}</span>
                </div>
              </div>
            )}
            <Button
              onClick={() => setRentalStep("details")}
              disabled={!selectedRange.from || !selectedRange.to}
              className="w-full gap-2"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRentalStep("browse")} className="w-full">
              Cancel
            </Button>
          </div>
        )}

        {rentalStep === "details" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Provide your rental details:</p>

            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Personal Information</p>
            <div>
              <Label className="text-sm">Full Name <span className="text-destructive">*</span></Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Email Address <span className="text-destructive">*</span></Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Phone Number <span className="text-destructive">*</span></Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 ..." className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Date of Birth <span className="text-destructive">*</span></Label>
              <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="mt-1" />
            </div>

            <Separator />
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Identity Verification</p>
            <div>
              <Label className="text-sm">Government-Issued ID Type</Label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="national_id">National ID</option>
              </select>
            </div>
            <div>
              <Label className="text-sm">Upload ID Document (optional)</Label>
              <Input type="file" accept="image/*,.pdf" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Selfie for Verification (optional)</Label>
              <Input type="file" accept="image/*" capture="user" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Profile Photo (optional)</Label>
              <Input type="file" accept="image/*" className="mt-1" />
            </div>

            <Separator />
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Stay Details</p>
            <div>
              <Label className="text-sm">Preferred Unit</Label>
              <Input value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="e.g. 1A" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Number of Guests / Occupants</Label>
              <Input type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Special Requests / Messages to Host (optional)</Label>
              <Textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Any special requirements or messages..." className="mt-1 h-20" />
            </div>

            <Separator />
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Billing Information</p>
            <div>
              <Label className="text-sm">Billing Address</Label>
              <Textarea value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="Your billing address..." className="mt-1 h-16" />
            </div>
            <div>
              <Label className="text-sm">Additional Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Past rental history, references..." className="mt-1 h-16" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setRentalStep("dates")} className="flex-1">Back</Button>
              <Button
                onClick={() => setRentalStep("contract")}
                disabled={!fullName.trim() || !email.trim() || !phone.trim() || !dateOfBirth}
                className="flex-1 gap-2"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {rentalStep === "contract" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Review and sign the lease agreement:</p>
            <div className="rounded-lg border bg-secondary p-4 text-xs text-muted-foreground space-y-2 max-h-52 overflow-y-auto">
              <p className="font-semibold text-foreground text-sm">LEASE AGREEMENT</p>
              <p>This Lease Agreement is entered into between the Landlord and <span className="font-medium text-foreground">{fullName}</span> for the property "<span className="font-medium text-foreground">{property.name}</span>" located at {property.address}, Unit {unitNumber}.</p>
              <p><strong>1. TERM:</strong> {selectedRange.from && format(selectedRange.from, "MMMM d, yyyy")} to {selectedRange.to && format(selectedRange.to, "MMMM d, yyyy")} ({monthCount} month{monthCount > 1 ? "s" : ""})</p>
              <p><strong>2. RENT:</strong> {formatCurrency(Number(property.monthly_rent), currency)} per month. Total: {formatCurrency(standardTotal, currency)}</p>
              <p><strong>3. SECURITY DEPOSIT:</strong> A security deposit equivalent to one month's rent may be required.</p>
              <p><strong>4. MAINTENANCE:</strong> Tenant shall report any maintenance issues promptly through the portal.</p>
              <p><strong>5. TERMINATION:</strong> Either party may terminate with 30 days written notice.</p>
              <p><strong>6. GOVERNING LAW:</strong> This agreement is governed by the laws of the property's jurisdiction.</p>
            </div>

            <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">By signing, you agree to all terms above. The landlord will also need to sign before the lease is finalized.</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRentalStep("details")} className="flex-1">Back</Button>
              <Button
                onClick={handleCreateAndSignContract}
                disabled={createAgreement.isPending || signAgreement.isPending}
                className="flex-1 gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90"
              >
                {(createAgreement.isPending || signAgreement.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pen className="h-4 w-4" />
                )}
                Sign & Continue
              </Button>
            </div>
          </div>
        )}

        {rentalStep === "payment" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">Agreement signed successfully!</p>
            </div>

            <div className="rounded-lg bg-secondary p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Property</span>
                <span className="font-medium text-foreground">{property.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit</span>
                <span className="font-medium text-foreground">{unitNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium text-foreground">{monthCount} month{monthCount > 1 ? "s" : ""}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-foreground">
                <span>Total Due</span>
                <span>{formatCurrency(standardTotal, currency)}</span>
              </div>
            </div>

            <Button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="w-full h-12 text-base gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90"
            >
              {paymentLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Pay {formatCurrency(standardTotal, currency)}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              You'll be redirected to a secure payment page
            </p>
          </div>
        )}
      </div>
    );
  };

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
              <img src={property.image_url} alt={property.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-slate">
                <Home className="h-16 w-16 text-primary-foreground/30" />
              </div>
            )}
            <div className="absolute top-3 left-3 flex gap-2">
              {isAirbnb && (
                <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm">
                  <Home className="mr-1 h-3 w-3" />Airbnb
                </Badge>
              )}
              <Badge variant="outline" className="bg-card/80 backdrop-blur-sm">{property.property_type}</Badge>
            </div>
          </div>

          {/* Title & Location */}
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{property.name}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />{property.address}
            </p>
            {property.description && (
              <p className="mt-4 text-foreground/80 leading-relaxed">{property.description}</p>
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
              <p className="mt-2 text-sm text-muted-foreground">{isAirbnb ? "Per Night" : "Monthly"}</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(Number(property.monthly_rent), currency, true)}</p>
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
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">What this place offers</h2>
            {amenities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {amenities.map((amenity) => {
                  const Icon = AMENITY_ICONS[amenity] || Star;
                  const label = AMENITY_LABELS[amenity] || amenity;
                  return (
                    <div key={amenity} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3">
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
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">Availability</h2>
                <p className="text-sm text-muted-foreground mb-4">Select your check-in and check-out dates.</p>
                <div className="flex justify-center">
                  <Calendar
                    mode="range"
                    selected={selectedRange as any}
                    onSelect={(range: any) => setSelectedRange(range || {})}
                    disabled={(date) => isBefore(date, startOfDay(new Date())) || isDateBooked(date)}
                    numberOfMonths={2}
                    className="rounded-lg border p-3 pointer-events-auto"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-2 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(Number(property.monthly_rent), currency)}
                </span>
                <span className="text-muted-foreground">{isAirbnb ? "/ night" : "/ month"}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAirbnb ? (
                <>
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
                  <div>
                    <Label className="text-sm">Guests</Label>
                    <Input type="number" min={1} max={property.units * 2} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Special Requests (optional)</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests..." className="mt-1 h-20" />
                  </div>
                  {nightCount > 0 && (
                    <div className="space-y-2 rounded-lg bg-secondary p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {formatCurrency(Number(property.monthly_rent), currency)} × {nightCount} night{nightCount > 1 ? "s" : ""}
                        </span>
                        <span className="text-foreground font-medium">{formatCurrency(airbnbTotal, currency)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>Total</span>
                        <span>{formatCurrency(airbnbTotal, currency)}</span>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={handleBook}
                    disabled={!selectedRange.from || !selectedRange.to || nightCount < 1 || createBooking.isPending}
                    className="w-full bg-gradient-warm text-accent-foreground hover:opacity-90 h-12 text-base"
                  >
                    {createBooking.isPending ? "Booking..." : "Reserve"}
                  </Button>
                  <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 p-3">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                    <p className="text-xs text-warning">Payment must be completed within 24 hours or the booking will be automatically released.</p>
                  </div>
                </>
              ) : (
                renderStandardSidebar()
              )}

              {rentalStep === "browse" && (
                <p className="text-center text-xs text-muted-foreground">You won't be charged yet</p>
              )}
            </CardContent>
          </Card>

          {isAirbnb && bookings && bookings.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between rounded-md bg-secondary p-2 text-xs">
                    <span className="text-foreground">
                      {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d")}
                    </span>
                    <Badge variant="outline" className={cn("text-xs", booking.payment_status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
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
