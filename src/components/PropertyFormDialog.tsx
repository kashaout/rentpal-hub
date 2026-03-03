import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, MapPin, DollarSign, Hash, ImageIcon, Home } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateProperty, useUpdateProperty, Property } from "@/hooks/useProperties";

const AVAILABLE_AMENITIES = [
  "wifi", "parking", "coffee", "kitchen", "pool",
  "gym", "security", "ac", "tv", "bathroom", "bedroom",
];

const AMENITY_LABELS: Record<string, string> = {
  wifi: "Free WiFi", parking: "Free Parking", coffee: "Coffee Maker",
  kitchen: "Full Kitchen", pool: "Swimming Pool", gym: "Fitness Center",
  security: "24/7 Security", ac: "Air Conditioning", tv: "Smart TV",
  bathroom: "Private Bathroom", bedroom: "King Bed",
};

const propertySchema = z.object({
  name: z.string().min(1, "Property name is required").max(100),
  address: z.string().min(1, "Address is required").max(255),
  units: z.coerce.number().min(1, "Must have at least 1 unit"),
  monthly_rent: z.coerce.number().min(0, "Rent must be positive"),
  image_url: z.string().url().optional().or(z.literal("")),
  listing_type: z.enum(["standard", "airbnb"]),
  description: z.string().optional().or(z.literal("")),
  amenities: z.array(z.string()).optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property;
}

export function PropertyFormDialog({ open, onOpenChange, property }: PropertyFormDialogProps) {
  const isEditing = !!property;
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: property?.name || "",
      address: property?.address || "",
      units: property?.units || 1,
      monthly_rent: property?.monthly_rent || 0,
      image_url: property?.image_url || "",
      listing_type: (property?.listing_type as "standard" | "airbnb") || "standard",
      description: property?.description || "",
      amenities: (property?.amenities as string[]) || [],
    },
  });

  const listingType = form.watch("listing_type");

  const onSubmit = async (data: PropertyFormData) => {
    try {
      if (isEditing) {
        await updateProperty.mutateAsync({
          id: property.id,
          name: data.name,
          address: data.address,
          units: data.units,
          monthly_rent: data.monthly_rent,
          image_url: data.image_url || undefined,
          listing_type: data.listing_type,
          description: data.description || undefined,
          amenities: data.amenities || [],
        });
      } else {
        await createProperty.mutateAsync({
          name: data.name,
          address: data.address,
          units: data.units,
          monthly_rent: data.monthly_rent,
          image_url: data.image_url || undefined,
          listing_type: data.listing_type,
          description: data.description || undefined,
          amenities: data.amenities || [],
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createProperty.isPending || updateProperty.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? "Edit Property" : "Add New Property"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="listing_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select listing type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Standard (Annual Rent)</SelectItem>
                      <SelectItem value="airbnb">Airbnb (Short-term Rental)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {listingType === "airbnb"
                      ? "Airbnb properties support Long Stay and Short Stay tenants."
                      : "Standard properties use annual rent billing."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Sunset Apartments" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="123 Main St, City" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="units"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Units</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="number" min={1} className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthly_rent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{listingType === "airbnb" ? "Nightly Rate (₦)" : "Monthly Rent (₦)"}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="number" min={0} step={0.01} className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="https://..." className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the property, its features, and neighbourhood..."
                      className="h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amenities */}
            {listingType === "airbnb" && (
              <FormField
                control={form.control}
                name="amenities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amenities & Facilities</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {AVAILABLE_AMENITIES.map((amenity) => {
                        const checked = (field.value || []).includes(amenity);
                        return (
                          <label
                            key={amenity}
                            className="flex items-center gap-2 rounded-md border border-border/50 p-2 cursor-pointer hover:bg-secondary transition-colors text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => {
                                const current = field.value || [];
                                field.onChange(
                                  c
                                    ? [...current, amenity]
                                    : current.filter((a: string) => a !== amenity)
                                );
                              }}
                            />
                            {AMENITY_LABELS[amenity] || amenity}
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-warm text-accent-foreground hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : isEditing ? "Save Changes" : "Add Property"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
