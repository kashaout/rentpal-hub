 import { useState } from "react";
 import { Star } from "lucide-react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
   DialogFooter,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { useUpdateMaintenanceRequest } from "@/hooks/useMaintenanceRequests";
 import { cn } from "@/lib/utils";
 
 interface RateMaintenanceDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   requestId: string;
   requestTitle: string;
 }
 
 export function RateMaintenanceDialog({
   open,
   onOpenChange,
   requestId,
   requestTitle,
 }: RateMaintenanceDialogProps) {
   const [rating, setRating] = useState(0);
   const [hoveredRating, setHoveredRating] = useState(0);
   const updateRequest = useUpdateMaintenanceRequest();
 
   const handleSubmit = async () => {
     if (rating === 0) return;
     
     await updateRequest.mutateAsync({
       id: requestId,
       rating,
     });
     onOpenChange(false);
     setRating(0);
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle>Rate This Repair</DialogTitle>
           <DialogDescription>
             How would you rate the repair work for "{requestTitle}"?
           </DialogDescription>
         </DialogHeader>
 
         <div className="py-6">
           <Label className="mb-3 block">Your Rating</Label>
           <div className="flex justify-center gap-2">
             {[1, 2, 3, 4, 5].map((star) => (
               <button
                 key={star}
                 type="button"
                 onClick={() => setRating(star)}
                 onMouseEnter={() => setHoveredRating(star)}
                 onMouseLeave={() => setHoveredRating(0)}
                 className="p-1 transition-transform hover:scale-110"
               >
                 <Star
                   className={cn(
                     "h-10 w-10 transition-colors",
                     (hoveredRating || rating) >= star
                       ? "fill-warning text-warning"
                       : "text-muted-foreground/30"
                   )}
                 />
               </button>
             ))}
           </div>
           {rating > 0 && (
             <p className="mt-3 text-center text-sm text-muted-foreground">
               {rating === 1 && "Poor"}
               {rating === 2 && "Fair"}
               {rating === 3 && "Good"}
               {rating === 4 && "Very Good"}
               {rating === 5 && "Excellent"}
             </p>
           )}
         </div>
 
         <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)}>
             Cancel
           </Button>
           <Button onClick={handleSubmit} disabled={rating === 0 || updateRequest.isPending}>
             {updateRequest.isPending ? "Submitting..." : "Submit Rating"}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }