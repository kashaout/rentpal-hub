import { useState } from "react";
import { format } from "date-fns";
import {
  Star, MessageSquare, Loader2, User, Building2,
  ThumbsUp, Award, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePropertyReviews, useMyReviews, useCreateReview, Review } from "@/hooks/useReviews";
import { useAuth } from "@/hooks/useAuth";
import { useProperties } from "@/hooks/useProperties";
import { cn } from "@/lib/utils";

function StarRating({
  value,
  onChange,
  size = "md",
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}) {
  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(i)}
          className={cn("transition-colors", readonly ? "cursor-default" : "cursor-pointer hover:scale-110")}
        >
          <Star
            className={cn(
              sizeClass,
              i <= value ? "fill-warning text-warning" : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{review.reviewer_name || "Anonymous"}</p>
            <p className="text-xs text-muted-foreground capitalize">{review.review_type} review</p>
          </div>
        </div>
        <div className="text-right">
          <StarRating value={review.overall_rating} readonly size="sm" />
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(review.created_at), "MMM d, yyyy")}
          </p>
        </div>
      </div>

      {review.comment && (
        <p className="text-sm text-muted-foreground leading-relaxed">"{review.comment}"</p>
      )}

      {/* Sub-ratings */}
      <div className="flex flex-wrap gap-3 text-xs">
        {review.cleanliness_rating && (
          <span className="text-muted-foreground">Cleanliness: <strong>{review.cleanliness_rating}/5</strong></span>
        )}
        {review.communication_rating && (
          <span className="text-muted-foreground">Communication: <strong>{review.communication_rating}/5</strong></span>
        )}
        {review.location_rating && (
          <span className="text-muted-foreground">Location: <strong>{review.location_rating}/5</strong></span>
        )}
        {review.value_rating && (
          <span className="text-muted-foreground">Value: <strong>{review.value_rating}/5</strong></span>
        )}
        {review.issue_resolution_rating && (
          <span className="text-muted-foreground">Issue Resolution: <strong>{review.issue_resolution_rating}/5</strong></span>
        )}
      </div>
    </div>
  );
}

function SubmitReviewDialog({
  open,
  onOpenChange,
  properties,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  properties: Array<{ id: string; name: string; landlord_id: string | null }>;
}) {
  const createReview = useCreateReview();
  const [propertyId, setPropertyId] = useState("");
  const [reviewType, setReviewType] = useState("property");
  const [overall, setOverall] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [location, setLocation] = useState(0);
  const [value, setValue] = useState(0);
  const [issueResolution, setIssueResolution] = useState(0);
  const [comment, setComment] = useState("");

  const reset = () => {
    setOverall(0); setCleanliness(0); setCommunication(0);
    setLocation(0); setValue(0); setIssueResolution(0);
    setComment(""); setPropertyId(""); setReviewType("property");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            Submit Review
          </DialogTitle>
          <DialogDescription>Share your experience with this property or host</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Property</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Review Type</Label>
            <Select value={reviewType} onValueChange={setReviewType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="property">Property Review</SelectItem>
                <SelectItem value="host">Host Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Overall Rating *</Label>
              <StarRating value={overall} onChange={setOverall} size="lg" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Cleanliness</Label>
              <StarRating value={cleanliness} onChange={setCleanliness} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Communication</Label>
              <StarRating value={communication} onChange={setCommunication} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Location</Label>
              <StarRating value={location} onChange={setLocation} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Value for Money</Label>
              <StarRating value={value} onChange={setValue} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Issue Resolution</Label>
              <StarRating value={issueResolution} onChange={setIssueResolution} />
            </div>
          </div>

          <div>
            <Label>Comment</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe your experience..."
              className="mt-1 h-24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button
            disabled={!propertyId || overall === 0 || createReview.isPending}
            onClick={async () => {
              const selected = properties.find((p) => p.id === propertyId);
              await createReview.mutateAsync({
                property_id: propertyId,
                review_type: reviewType,
                overall_rating: overall,
                cleanliness_rating: cleanliness || undefined,
                communication_rating: communication || undefined,
                location_rating: location || undefined,
                value_rating: value || undefined,
                issue_resolution_rating: issueResolution || undefined,
                comment: comment || undefined,
                reviewee_id: reviewType === "host" ? selected?.landlord_id || undefined : undefined,
              });
              reset();
              onOpenChange(false);
            }}
          >
            {createReview.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewsPage() {
  const { isAdmin, isLandlord, isTenant } = useAuth();
  const { data: myReviews = [], isLoading } = useMyReviews();
  const { data: properties = [] } = useProperties();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [tab, setTab] = useState("all");

  const receivedReviews = myReviews.filter((r) => r.reviewee_id);
  const givenReviews = myReviews.filter((r) => !r.reviewee_id || r.reviewer_name);

  // Compute aggregate stats
  const avgRating = myReviews.length > 0
    ? (myReviews.reduce((sum, r) => sum + r.overall_rating, 0) / myReviews.length).toFixed(1)
    : "—";

  const filteredReviews = tab === "received" ? receivedReviews
    : tab === "given" ? givenReviews
    : myReviews;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">{avgRating}</p>
              <Star className="h-6 w-6 fill-warning text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{myReviews.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">5-Star Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">{myReviews.filter((r) => r.overall_rating === 5).length}</p>
              <Award className="h-6 w-6 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions + Tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({myReviews.length})</TabsTrigger>
            <TabsTrigger value="received">Received ({receivedReviews.length})</TabsTrigger>
            <TabsTrigger value="given">Given ({givenReviews.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        {isTenant && (
          <Button onClick={() => setSubmitOpen(true)} className="gap-2">
            <Star className="h-4 w-4" />
            Write Review
          </Button>
        )}
      </div>

      {/* Review List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reviews
          </CardTitle>
          <CardDescription>
            {tab === "received" ? "Reviews others have written about you" :
             tab === "given" ? "Reviews you've submitted" : "All reviews"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReviews.length > 0 ? (
            <div className="space-y-3">
              {filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Star className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2">No reviews yet.</p>
              {isTenant && <p className="text-sm">Complete a stay to leave a review.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <SubmitReviewDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        properties={properties?.map((p: any) => ({ id: p.id, name: p.name, landlord_id: p.landlord_id })) || []}
      />
    </div>
  );
}
