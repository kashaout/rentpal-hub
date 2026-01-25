import { useState, useRef } from "react";
import { Camera, X, Loader2, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  useUpdateMaintenanceRequest,
  MaintenanceRequestWithDetails,
} from "@/hooks/useMaintenanceRequests";
import { useMaintenanceUsers } from "@/hooks/useMaintenanceUsers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface MaintenanceUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequestWithDetails;
}

type MaintenanceStatus = "pending" | "in_progress" | "completed" | "cancelled";

export function MaintenanceUpdateDialog({
  open,
  onOpenChange,
  request,
}: MaintenanceUpdateDialogProps) {
  const { user, isAdmin, isLandlord, isConsultant } = useAuth();
  const [status, setStatus] = useState<MaintenanceStatus>(request.status);
  const [repairNotes, setRepairNotes] = useState(request.repair_notes || "");
  const [assignedTo, setAssignedTo] = useState<string>(request.assigned_to || "unassigned");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>(request.photo_urls || []);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateRequest = useUpdateMaintenanceRequest();
  const { data: maintenanceUsers, isLoading: loadingUsers } = useMaintenanceUsers();

  const canAssign = isAdmin || isLandlord || isConsultant;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    
    if (imageFiles.length + photos.length > 10) {
      toast({
        title: "Too many photos",
        description: "Maximum 10 photos allowed per request.",
        variant: "destructive",
      });
      return;
    }

    setPhotos((prev) => [...prev, ...imageFiles]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const photo of photos) {
      const fileExt = photo.name.split(".").pop();
      const fileName = `${user?.id}/${request.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("maintenance-photos")
        .upload(fileName, photo);

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from("maintenance-photos")
        .getPublicUrl(data.path);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    try {
      setIsUploading(true);

      // Upload new photos
      const newPhotoUrls = await uploadPhotos();
      const allPhotoUrls = [...photoUrls, ...newPhotoUrls];

      // Update the request
      await updateRequest.mutateAsync({
        id: request.id,
        status: status as "pending" | "in_progress" | "completed" | "cancelled",
        resolved_at: status === "completed" ? new Date().toISOString() : null,
        repair_notes: repairNotes || undefined,
        photo_urls: allPhotoUrls.length > 0 ? allPhotoUrls : undefined,
        assigned_to: assignedTo === "unassigned" ? null : assignedTo,
      });

      onOpenChange(false);
      setPhotos([]);
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: "Failed to update the request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Maintenance Request</DialogTitle>
          <DialogDescription>
            Update the status and add repair notes for: {request.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as MaintenanceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assign To (only for admins, landlords, consultants) */}
          {canAssign && (
            <div className="space-y-2">
              <Label htmlFor="assigned-to">Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select maintenance worker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Unassigned
                    </span>
                  </SelectItem>
                  {maintenanceUsers?.map((worker) => (
                    <SelectItem key={worker.user_id} value={worker.user_id}>
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {worker.full_name || worker.email}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingUsers && (
                <p className="text-xs text-muted-foreground">Loading workers...</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="notes">Repair Notes</Label>
            <Textarea
              id="notes"
              placeholder="Describe the work completed, parts used, or any issues encountered..."
              value={repairNotes}
              onChange={(e) => setRepairNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photos</Label>
            <div className="rounded-lg border border-dashed p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="flex flex-wrap gap-2 mb-3">
                {/* Existing photos */}
                {photoUrls.map((url, idx) => (
                  <div key={`existing-${idx}`} className="relative h-16 w-16">
                    <img
                      src={url}
                      alt={`Existing photo ${idx + 1}`}
                      className="h-full w-full rounded-md object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(idx)}
                      className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {/* New photos to upload */}
                {photos.map((photo, idx) => (
                  <div key={`new-${idx}`} className="relative h-16 w-16">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`New photo ${idx + 1}`}
                      className="h-full w-full rounded-md object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full gap-2"
                disabled={photos.length + photoUrls.length >= 10}
              >
                <Camera className="h-4 w-4" />
                Add Photos
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {photos.length + photoUrls.length}/10 photos
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
