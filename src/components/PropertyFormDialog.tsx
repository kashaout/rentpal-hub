import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, MapPin, Banknote, Hash, ImageIcon, Home, Upload, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  image_url: z.string().optional().or(z.literal("")),
  listing_type: z.enum(["standard", "airbnb"]),
  description: z.string().optional().or(z.literal("")),
  amenities: z.array(z.string()).optional(),
  is_public: z.boolean().optional(),
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(property?.image_url || "");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");

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
      is_public: (property as any)?.is_public ?? true,
    },
  });

  const listingType = form.watch("listing_type");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image (JPEG, PNG, WebP, or GIF)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("[property-images] upload failed", { uploadError, fileName, userId: user.id });
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("property-images")
        .getPublicUrl(fileName);

      form.setValue("image_url", publicUrl);
      setPreviewUrl(publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      const msg = error?.message || "Unknown error";
      const friendly = /row-level security|not authorized|permission/i.test(msg)
        ? "You need landlord access to upload property images. Please verify your landlord account."
        : msg;
      toast.error("Upload failed: " + friendly);
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    form.setValue("image_url", "");
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
          is_public: data.is_public,
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
          is_public: data.is_public,
        });
      }
      onOpenChange(false);
      form.reset();
      setPreviewUrl("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createProperty.isPending || updateProperty.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                  <FormLabel>Property Name {isEditing && <span className="text-xs text-muted-foreground">(locked)</span>}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Sunset Apartments"
                        className="pl-10"
                        {...field}
                        readOnly={isEditing}
                        disabled={isEditing}
                      />
                    </div>
                  </FormControl>
                  {isEditing && (
                    <FormDescription>
                      Building name cannot be changed after creation.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address {isEditing && <span className="text-xs text-muted-foreground">(locked)</span>}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="123 Main St, City"
                        className="pl-10"
                        {...field}
                        readOnly={isEditing}
                        disabled={isEditing}
                      />
                    </div>
                  </FormControl>
                  {isEditing && (
                    <FormDescription>
                      Street address cannot be changed after creation.
                    </FormDescription>
                  )}
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
                        <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="number" min={0} step={0.01} className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Image Upload Section */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Image (optional)</FormLabel>
                  <div className="space-y-3">
                    {/* Toggle between upload and URL */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={uploadMode === "file" ? "default" : "outline"}
                        onClick={() => setUploadMode("file")}
                        className={uploadMode === "file" ? "bg-gradient-warm text-accent-foreground" : ""}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Upload File
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={uploadMode === "url" ? "default" : "outline"}
                        onClick={() => setUploadMode("url")}
                        className={uploadMode === "url" ? "bg-gradient-warm text-accent-foreground" : ""}
                      >
                        <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                        Paste URL
                      </Button>
                    </div>

                    {uploadMode === "file" ? (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div
                          onClick={() => !uploading && fileInputRef.current?.click()}
                          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
                        >
                          {uploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              <p className="text-sm text-muted-foreground">Uploading...</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Click to upload from your computer
                              </p>
                              <p className="text-xs text-muted-foreground/70">
                                JPEG, PNG, WebP or GIF • Max 5MB
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <FormControl>
                        <div className="relative">
                          <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="https://..."
                            className="pl-10"
                            value={field.value || ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              setPreviewUrl(e.target.value);
                            }}
                          />
                        </div>
                      </FormControl>
                    )}

                    {/* Image Preview */}
                    {previewUrl && (
                      <div className="relative rounded-lg overflow-hidden border border-border">
                        <img
                          src={previewUrl}
                          alt="Property preview"
                          className="w-full h-32 object-cover"
                          onError={() => setPreviewUrl("")}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={clearImage}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
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

            {/* Public/Private Toggle */}
            <FormField
              control={form.control}
              name="is_public"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Public Listing</FormLabel>
                    <FormDescription className="text-xs">
                      Public properties appear on the marketplace and are visible to tenants.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-warm text-accent-foreground hover:opacity-90"
                disabled={isLoading || uploading}
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
