import { useState, useMemo, useRef, useEffect } from "react";
import { format, eachDayOfInterval, parseISO, differenceInDays, isBefore, startOfDay, addMonths } from "date-fns";
import {
  MapPin, Users, Banknote, Star, Wifi, Car, Coffee, Utensils,
  Waves, Dumbbell, ShieldCheck, Wind, Tv, Bath, Bed, ArrowLeft,
  CalendarIcon, Home, Loader2, Clock, AlertTriangle, ArrowRight,
  CheckCircle2, Pen, FileText, CreditCard, Upload, Camera, Image
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { encodeBookingNotes } from "@/lib/bookingTime";
import { usePublicProperty } from "@/hooks/usePublicProperty";
import { usePropertyBookings, useCreateBooking } from "@/hooks/useBookings";
import { useAuth } from "@/hooks/useAuth";
import { useCreateLeaseAgreement, useSignLeaseAgreement, useLeaseAgreementByProperty } from "@/hooks/useLeaseAgreements";
import { formatCurrency } from "@/lib/formatCurrency";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { usePricingPreview } from "@/hooks/usePricingPreview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IdentityWizard } from "@/components/IdentityWizard";

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

type RentalStep = "browse" | "dates" | "details" | "contract" | "payment" | "complete";

const STEPS: { key: RentalStep; label: string; icon: any }[] = [
  { key: "dates", label: "Dates", icon: CalendarIcon },
  { key: "details", label: "Details", icon: Users },
  { key: "contract", label: "Contract", icon: FileText },
  { key: "payment", label: "Payment", icon: CreditCard },
];

interface PropertyDetailViewProps {
  propertyId: string;
  onBack: () => void;
  /** If true, we just came back from a successful payment */
  paymentSuccess?: boolean;
}

export function PropertyDetailView({ propertyId, onBack, paymentSuccess }: PropertyDetailViewProps) {
  const { data: publicProperty, isLoading: publicLoading } = usePublicProperty(propertyId);
  // Tenant detail view always reads from the public listing (safe columns only)
  const property = publicProperty;
  const isLoading = publicLoading;
  const { data: bookings } = usePropertyBookings(propertyId);
  const createBooking = useCreateBooking();
  const { user, profile, isLandlord, isAdmin, isConsultant } = useAuth();
  const { toast } = useToast();
  const createAgreement = useCreateLeaseAgreement();
  const signAgreement = useSignLeaseAgreement();

  // Landlords/admins/consultants should NOT be able to reserve/book
  const isManagerRole = isLandlord || isAdmin || isConsultant;

  // Rental flow state
  const [rentalStep, setRentalStep] = useState<RentalStep>(paymentSuccess ? "complete" : "browse");
  const [selectedRange, setSelectedRange] = useState<{ from?: Date; to?: Date }>({});
  const [checkInTime, setCheckInTime] = useState<string>("15:00");
  const [checkOutTime, setCheckOutTime] = useState<string>("11:00");
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState("");
  // Identity is sourced from profiles (read-only). The user must confirm
  // their verified identity is still valid before reserving / signing.
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const fullName = profile?.full_name || "";
  const email = user?.email || "";
  const phone = profile?.phone || "";
  const dateOfBirth = profile?.date_of_birth || "";
  const govIdNumber = profile?.government_id_number || "";
  const billingAddressObj = profile?.billing_address || null;
  const billingAddress =
    typeof billingAddressObj === "string"
      ? billingAddressObj
      : billingAddressObj &&
          typeof billingAddressObj === "object" &&
          !Array.isArray(billingAddressObj) &&
          typeof billingAddressObj.line1 === "string"
        ? billingAddressObj.line1
        : "";
  const identityComplete = Boolean(profile?.identity_complete);

  const [unitNumber, setUnitNumber] = useState("1");
  const [specialRequests, setSpecialRequests] = useState("");
  const [createdAgreementId, setCreatedAgreementId] = useState<string | null>(null);
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [showIdentityWizard, setShowIdentityWizard] = useState(false);

  const uploadFileToStorage = async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tenant-verification").upload(filePath, file);
    if (error) {
      sonnerToast.error(`Upload failed: ${error.message}`);
      return null;
    }
    return filePath;
  };

  const notifyLandlord = async (agreementId: string, landlordId: string) => {
    if (!user || !property || !selectedRange.from || !selectedRange.to) return;
    await supabase.from("landlord_notifications").insert({
      landlord_user_id: landlordId,
      tenant_user_id: user.id,
      lease_agreement_id: agreementId,
      property_id: property.id,
      notification_type: "lease_signing",
      title: "New Lease Agreement Awaiting Your Signature",
      message: `${fullName || "A tenant"} has signed a lease agreement for ${property.name}, Unit ${unitNumber}. Please review and counter-sign.`,
    });

    supabase.functions.invoke("notify-landlord-lease", {
      body: {
        landlord_user_id: landlordId,
        tenant_name: fullName || "A tenant",
        property_name: property.name,
        unit_number: unitNumber,
        lease_start: format(selectedRange.from, "MMM d, yyyy"),
        lease_end: format(selectedRange.to, "MMM d, yyyy"),
      },
    }).catch(console.error);
  };

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

  const monthCount = selectedRange.from && selectedRange.to
    ? Math.max(1, Math.round(nightCount / 30))
    : 0;
  const standardTotal = property ? monthCount * Number(property.monthly_rent) : 0;
  const airbnbTotal = property ? nightCount * Number(property.monthly_rent) : 0;
  const totalPrice = isAirbnb ? airbnbTotal : standardTotal;

  // Tenant-safe pricing preview via SECURITY DEFINER RPC.
  // React Query caches per (property + dates + promo) so changing inputs
  // doesn't refetch the full rules list — only the RPC is called.
  const { data: pricingPreview } = usePricingPreview({
    propertyId: property?.id,
    startDate: selectedRange.from ? format(selectedRange.from, "yyyy-MM-dd") : null,
    endDate: selectedRange.to ? format(selectedRange.to, "yyyy-MM-dd") : null,
    promoCode: promoCode || null,
    enabled: Boolean(property?.id && selectedRange.from && selectedRange.to && totalPrice > 0),
  });

  const finalPrice = pricingPreview?.final_price ?? totalPrice;
  const hasDiscount = (pricingPreview?.discount_amount ?? 0) > 0;

  const handleCreateAndSignContract = async () => {
    if (!property || !user || !selectedRange.from || !selectedRange.to) return;

    // Hard guards — never pass empty strings to a UUID column
    if (!property.id) {
      console.error("[lease] Missing property.id", property);
      sonnerToast.error("Invalid property selected");
      return;
    }
    if (!property.landlord_id) {
      console.error("[lease] Property has no landlord_id", property);
      sonnerToast.error("This property is missing an owner. Please contact support.");
      return;
    }

    if (!identityComplete) {
      sonnerToast.error("Please complete identity verification before reserving a property.");
      return;
    }
    if (!identityConfirmed) {
      sonnerToast.error("Please confirm your identity details are still valid.");
      return;
    }

    try {
      setUploading(true);

      const agreement = await createAgreement.mutateAsync({
        property_id: property.id,
        tenant_user_id: user.id,
        landlord_user_id: property.landlord_id,
        tenant_name: fullName || user.email || "Tenant",
        landlord_name: "Landlord",
        unit_number: unitNumber,
        rent_amount: Number(property.monthly_rent),
        currency: property.currency || "NGN",
        lease_start: format(selectedRange.from, "yyyy-MM-dd"),
        lease_end: format(selectedRange.to, "yyyy-MM-dd"),
        terms: `LEASE AGREEMENT\n\nThis Lease Agreement is entered into between the Landlord and ${fullName || "Tenant"} for the property "${property.name}" located at ${property.address}, Unit ${unitNumber}.\n\nTENANT DETAILS:\nFull Name: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nDate of Birth: ${dateOfBirth ? format(new Date(dateOfBirth + "T00:00:00"), "MMMM d, yyyy") : "N/A"}\nGovernment ID: ${govIdNumber || "N/A"}\nBilling Address: ${billingAddress || "N/A"}\nOccupants: ${guestCount}\n\n1. TERM: The lease shall commence on ${format(selectedRange.from, "MMMM d, yyyy")} and terminate on ${format(selectedRange.to, "MMMM d, yyyy")}.\n\n2. RENT: The monthly rent shall be ${formatCurrency(Number(property.monthly_rent), property.currency || "NGN")}. Total for the lease period: ${formatCurrency(totalPrice, property.currency || "NGN")}.\n\n3. OCCUPANTS: ${guestCount} guest${guestCount > 1 ? "s" : ""}.\n\n4. SECURITY DEPOSIT: A security deposit equivalent to one month's rent may be required.\n\n5. MAINTENANCE: Tenant shall report any maintenance issues promptly through the portal.\n\n6. TERMINATION: Either party may terminate this agreement with 30 days written notice.\n\n7. GOVERNING LAW: This agreement shall be governed by the laws of the jurisdiction where the property is located.${specialRequests ? `\n\nSPECIAL REQUESTS: ${specialRequests}` : ""}`,
      });

      setCreatedAgreementId(agreement.id);

      await signAgreement.mutateAsync({ agreementId: agreement.id, role: "tenant" });
      setAgreementSigned(true);

      // Create tenant record
      try {
        await supabase.from("tenants").insert({
          property_id: property.id,
          user_id: user.id,
          unit_number: unitNumber,
          lease_start: format(selectedRange.from, "yyyy-MM-dd"),
          lease_end: format(selectedRange.to, "yyyy-MM-dd"),
          rent_amount: Number(property.monthly_rent),
          tenant_type: isAirbnb ? "short_stay" : "long_stay",
          payment_status: "pending",
        });
      } catch (e) {
        console.error("Failed to create tenant record:", e);
      }

      // For airbnb, also create booking
      if (isAirbnb) {
        try {
          await createBooking.mutateAsync({
            property_id: property.id,
            check_in: format(selectedRange.from, "yyyy-MM-dd"),
            check_out: format(selectedRange.to, "yyyy-MM-dd"),
            total_price: totalPrice,
            guest_count: guestCount,
            landlord_id: property.landlord_id || undefined,
            promo_code: promoCode || null,
            months: monthCount,
            nights: nightCount,
            // Persist user-selected times alongside any free-form note as JSON
            notes: encodeBookingNotes({ checkInTime, checkOutTime, note: notes }) ?? undefined,
          });
        } catch (e) {
          console.error("Failed to create booking record:", e);
        }
      }

      // Store lease document
      try {
        const leaseDocContent = new Blob(
          [agreement.terms || "Lease agreement terms"],
          { type: "text/plain" }
        );
        const docFileName = `${user.id}/lease_${agreement.id}_${Date.now()}.txt`;
        await supabase.storage.from("documents").upload(docFileName, leaseDocContent);
        await supabase.from("documents").insert({
          name: `Lease Agreement - ${property.name} - Unit ${unitNumber}`,
          file_path: docFileName,
          file_type: "txt",
          file_size: leaseDocContent.size,
          category: "Lease Agreement",
          property_id: property.id,
          uploaded_by: user.id,
        });
      } catch (e) {
        console.error("Failed to store lease document:", e);
      }

      // Identity is sourced from profile (read-only); no profile mutation here.

      // Notify landlord
      const landlordId = property.landlord_id || user.id;
      await notifyLandlord(agreement.id, landlordId);

      setRentalStep("payment");
    } catch (error) {
      // Error toast already handled by hooks
    } finally {
      setUploading(false);
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
          propertyId: property.id,
          propertyName: property.name,
          unitNumber: unitNumber,
        },
      });

      if (error) throw error;
      if (data?.url) {
        // Open in same tab so redirect works
        window.location.href = data.url;
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

  const durationLabel = isAirbnb
    ? `${nightCount} night${nightCount > 1 ? "s" : ""}`
    : `${monthCount} month${monthCount > 1 ? "s" : ""}`;
  const booking = bookings?.find((b) => b.user_id === user?.id && b.status === "confirmed") ?? null;

  // Date picker popover component
  const DatePickerPopover = ({ label, value, onSelect, disabled }: { label: string; value?: Date; onSelect: (d: Date | undefined) => void; disabled?: (date: Date) => boolean }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-auto py-3",
            !value && "text-muted-foreground"
          )}
        >
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground uppercase">{label}</span>
            <span className="text-sm font-medium">
              {value ? format(value, "MMM d, yyyy") : "Select date"}
            </span>
          </div>
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onSelect}
          disabled={disabled}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );

  // Shared wizard steps for details → contract → payment
  const renderWizardSteps = () => {
    const visibleSteps = isAirbnb ? STEPS.filter(s => s.key !== "dates") : STEPS;
    const visibleStepIndex = visibleSteps.findIndex((s) => s.key === rentalStep);

    return (
      <div className="space-y-4">
        {/* Step Progress */}
        <div className="flex items-center justify-between mb-2">
          {visibleSteps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === visibleStepIndex;
            const isDone = i < visibleStepIndex;
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
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select your lease period:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DateTimePicker
                label="Check-in"
                date={selectedRange.from}
                onDateChange={(d) => setSelectedRange(prev => ({ ...prev, from: d }))}
                time={checkInTime}
                onTimeChange={setCheckInTime}
                defaultTime="15:00"
                disabled={(date) => isBefore(date, startOfDay(new Date())) || isDateBooked(date)}
              />
              <DateTimePicker
                label="Check-out"
                date={selectedRange.to}
                onDateChange={(d) => setSelectedRange(prev => ({ ...prev, to: d }))}
                time={checkOutTime}
                onTimeChange={setCheckOutTime}
                defaultTime="11:00"
                disabled={(date) => {
                  if (!selectedRange.from) return true;
                  return isBefore(date, selectedRange.from) || isDateBooked(date);
                }}
              />
            </div>
            {nightCount > 0 && (
              <div className="space-y-2 rounded-lg bg-secondary p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(Number(property.monthly_rent), currency)} × {durationLabel}
                  </span>
                  <span className={cn("font-medium", hasDiscount ? "text-muted-foreground line-through" : "text-foreground")}>
                    {formatCurrency(totalPrice, currency)}
                  </span>
                </div>
                {hasDiscount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-accent">
                      {pricingPreview?.rule_name ?? "Discount"} (−{formatCurrency(pricingPreview!.discount_amount, currency)})
                    </span>
                    <span className="text-foreground font-semibold">{formatCurrency(finalPrice, currency)}</span>
                  </div>
                )}
                <div className="pt-2">
                  <Label htmlFor="promo" className="text-xs text-muted-foreground">Promo code (optional)</Label>
                  <Input
                    id="promo"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter code"
                    className="h-9 mt-1"
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setRentalStep("browse")} className="flex-1">Back</Button>
              <Button
                onClick={() => setRentalStep("details")}
                disabled={!selectedRange.from || !selectedRange.to || nightCount < 1}
                className="flex-1 gap-2"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {rentalStep === "details" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Confirm your verified identity for this {isAirbnb ? "booking" : "lease"}:</p>

            {!identityComplete ? (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div className="text-sm text-foreground">
                    <p className="font-semibold">Identity verification required</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please complete identity verification before reserving a property.
                      Go to <span className="font-medium">Settings → Identity</span> to finish.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-secondary p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Your verified identity will be used for this {isAirbnb ? "booking" : "lease"}</p>
                <div className="grid grid-cols-[120px_1fr] gap-y-1.5 text-sm">
                  <span className="text-muted-foreground">Name:</span><span className="font-medium text-foreground">{fullName || "—"}</span>
                  <span className="text-muted-foreground">Email:</span><span className="font-medium text-foreground">{email || "—"}</span>
                  <span className="text-muted-foreground">Phone:</span><span className="font-medium text-foreground">{phone || "—"}</span>
                  <span className="text-muted-foreground">DOB:</span><span className="font-medium text-foreground">{dateOfBirth ? format(new Date(dateOfBirth + "T00:00:00"), "MMMM d, yyyy") : "—"}</span>
                  <span className="text-muted-foreground">Gov ID:</span><span className="font-medium text-foreground">{govIdNumber || "—"}</span>
                  <span className="text-muted-foreground">Billing:</span><span className="font-medium text-foreground">{billingAddress || "—"}</span>
                </div>
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={identityConfirmed}
                    onChange={(e) => setIdentityConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm text-foreground">Confirm details are still valid</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Need to update this? Go to <span className="font-medium">Settings → Identity</span>.
                </p>
              </div>
            )}

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
            <div>
              <Label className="text-sm">Additional Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Past rental history, references..." className="mt-1 h-16" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setRentalStep(isAirbnb ? "browse" : "dates")} className="flex-1">Back</Button>
              <Button
                onClick={() => setRentalStep("contract")}
                disabled={!identityComplete || !identityConfirmed}
                className="flex-1 gap-2"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {rentalStep === "contract" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Review and sign the {isAirbnb ? "booking" : "lease"} agreement:</p>
            <div className="rounded-lg border bg-secondary p-4 text-xs text-muted-foreground space-y-2 max-h-64 overflow-y-auto">
              <p className="font-semibold text-foreground text-sm">{isAirbnb ? "BOOKING AGREEMENT" : "LEASE AGREEMENT"}</p>
              <p>This Agreement is entered into between the {isAirbnb ? "Host" : "Landlord"} and <span className="font-medium text-foreground">{fullName}</span> for the property "<span className="font-medium text-foreground">{property.name}</span>" located at {property.address}, Unit {unitNumber}.</p>

              <p className="font-semibold text-foreground text-xs uppercase tracking-wide pt-1">Guest / Tenant Details</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span>Full Name:</span><span className="font-medium text-foreground">{fullName}</span>
                <span>Email:</span><span className="font-medium text-foreground">{email}</span>
                <span>Phone:</span><span className="font-medium text-foreground">{phone}</span>
                <span>Date of Birth:</span><span className="font-medium text-foreground">{dateOfBirth ? format(new Date(dateOfBirth + "T00:00:00"), "MMMM d, yyyy") : "—"}</span>
                <span>Government ID:</span><span className="font-medium text-foreground">{govIdNumber || "—"}</span>
                <span>Billing Address:</span><span className="font-medium text-foreground">{billingAddress || "—"}</span>
              </div>

              <p className="font-semibold text-foreground text-xs uppercase tracking-wide pt-1">{isAirbnb ? "Booking" : "Lease"} Terms</p>
              <p><strong>1. TERM:</strong> {selectedRange.from && format(selectedRange.from, "MMMM d, yyyy")} to {selectedRange.to && format(selectedRange.to, "MMMM d, yyyy")} ({durationLabel})</p>
              <p><strong>2. {isAirbnb ? "RATE" : "RENT"}:</strong> {formatCurrency(Number(property.monthly_rent), currency)} per {isAirbnb ? "night" : "month"}. Total: {formatCurrency(totalPrice, currency)}</p>
              <p><strong>3. OCCUPANTS:</strong> {guestCount} guest{guestCount > 1 ? "s" : ""}</p>
              <p><strong>4. UNIT:</strong> {unitNumber}</p>
              {!isAirbnb && <p><strong>5. SECURITY DEPOSIT:</strong> A security deposit equivalent to one month's rent may be required.</p>}
              <p><strong>{isAirbnb ? "5" : "6"}. MAINTENANCE:</strong> {isAirbnb ? "Guest" : "Tenant"} shall report any issues promptly.</p>
              <p><strong>{isAirbnb ? "6" : "7"}. {isAirbnb ? "CANCELLATION" : "TERMINATION"}:</strong> {isAirbnb ? "Cancellation policy applies as per platform terms." : "Either party may terminate with 30 days written notice."}</p>
              <p><strong>{isAirbnb ? "7" : "8"}. GOVERNING LAW:</strong> This agreement is governed by the laws of the property's jurisdiction.</p>

              {(specialRequests || billingAddress) && (
                <>
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wide pt-1">Additional Information</p>
                  {specialRequests && <p><strong>Special Requests:</strong> {specialRequests}</p>}
                  {billingAddress && <p><strong>Billing Address:</strong> {billingAddress}</p>}
                </>
              )}
            </div>

            <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">By signing, you agree to all terms above. {isAirbnb ? "Payment must be completed within 24 hours." : "The landlord will also need to sign before the lease is finalized."}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRentalStep("details")} className="flex-1">Back</Button>
              <Button
                onClick={handleCreateAndSignContract}
                disabled={createAgreement.isPending || signAgreement.isPending || uploading}
                className="flex-1 gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90"
              >
                {(createAgreement.isPending || signAgreement.isPending || uploading) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pen className="h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Sign & Continue"}
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
                <span className="font-medium text-foreground">{durationLabel}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-foreground">
                <span>Total Due</span>
                <span>{formatCurrency(totalPrice, currency)}</span>
              </div>
            </div>

            <Button
              onClick={handlePayment}
              disabled={booking?.status === "confirmed"}
              className="w-full h-12 text-base gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90"
            >
              {paymentLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {booking?.status === "confirmed" ? "Paid" : `Pay ${formatCurrency(totalPrice, currency)}`}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              You'll be redirected to a secure payment page
            </p>
          </div>
        )}

        {rentalStep === "complete" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">Payment Complete!</p>
            </div>
            <div className="rounded-lg bg-success/10 border border-success/20 p-4 space-y-2 text-sm">
              <p className="font-medium text-foreground">Your booking is confirmed.</p>
              <p className="text-muted-foreground text-xs">The property is now reserved for your selected dates. Your landlord has been notified.</p>
            </div>
            <Badge className="bg-success/10 text-success border-success/20 w-full justify-center py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Booked
            </Badge>
          </div>
        )}
      </div>
    );
  };

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
          {!isManagerRole && (
            <Button
              className="w-full bg-gradient-warm text-accent-foreground hover:opacity-90 h-12 text-base gap-2"
              onClick={() => setRentalStep("dates")}
            >
              Rent <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {isManagerRole && (
            <p className="text-center text-xs text-muted-foreground italic">
              Only tenants can reserve properties.
            </p>
          )}
        </>
      );
    }

    return renderWizardSteps();
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
                  <Home className="mr-1 h-3 w-3" />AirBnB
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
              <Banknote className="mx-auto h-5 w-5 text-muted-foreground" />
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
              {!isManagerRole && !identityComplete ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Identity verification required</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>You must complete identity verification before reserving this property.</p>
                    <Button
                      size="sm"
                      onClick={() => setShowIdentityWizard(true)}
                      className="w-full"
                    >
                      Complete Identity
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : isAirbnb ? (
                rentalStep !== "browse" ? renderWizardSteps() : (
                <>
                  {/* Airbnb date+time pickers in sidebar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DateTimePicker
                      label="Check-in"
                      date={selectedRange.from}
                      onDateChange={(d) => setSelectedRange(prev => ({ ...prev, from: d }))}
                      time={checkInTime}
                      onTimeChange={setCheckInTime}
                      defaultTime="15:00"
                      disabled={(date) => isBefore(date, startOfDay(new Date())) || isDateBooked(date)}
                    />
                    <DateTimePicker
                      label="Check-out"
                      date={selectedRange.to}
                      onDateChange={(d) => setSelectedRange(prev => ({ ...prev, to: d }))}
                      time={checkOutTime}
                      onTimeChange={setCheckOutTime}
                      defaultTime="11:00"
                      disabled={(date) => {
                        if (!selectedRange.from) return true;
                        return isBefore(date, selectedRange.from) || isDateBooked(date);
                      }}
                    />
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
                  {!isManagerRole ? (
                    <Button
                      onClick={() => setRentalStep("details")}
                      disabled={!selectedRange.from || !selectedRange.to || nightCount < 1}
                      className="w-full bg-gradient-warm text-accent-foreground hover:opacity-90 h-12 text-base"
                    >
                      Reserve
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground italic">
                      Only tenants can reserve properties.
                    </p>
                  )}
                  <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 p-3">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                    <p className="text-xs text-warning">Payment must be completed within 24 hours or the booking will be automatically released.</p>
                  </div>
                </>
                )
              ) : (
                renderStandardSidebar()
              )}

              {rentalStep === "browse" && !isManagerRole && identityComplete && (
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
                    <Badge variant="outline" className={cn("text-xs", booking.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                      {booking.status === "confirmed" ? "Confirmed" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {showIdentityWizard && (
        <IdentityWizard onComplete={() => setShowIdentityWizard(false)} />
      )}
    </div>
  );
}
