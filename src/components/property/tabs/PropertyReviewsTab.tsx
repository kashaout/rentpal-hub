import { Loader2, Star, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePropertyReviews } from "@/hooks/useReviews";
import { format } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";

interface Props {
  propertyId: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "text-warning fill-warning" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export function PropertyReviewsTab({ propertyId }: Props) {
  const { data: reviews, isLoading } = usePropertyReviews(propertyId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!reviews?.length) {
    return (
      <EmptyState
        icon={Star}
        title="No reviews yet"
        description="Reviews from tenants and guests will appear here after their stay."
      />
    );
  }

  const avgRating =
    reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold">{avgRating.toFixed(1)}</p>
            <StarRating rating={Math.round(avgRating)} />
            <p className="text-xs text-muted-foreground mt-1">
              {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {[
              { label: "Cleanliness", key: "cleanliness_rating" },
              { label: "Communication", key: "communication_rating" },
              { label: "Location", key: "location_rating" },
              { label: "Value", key: "value_rating" },
              { label: "Issue Resolution", key: "issue_resolution_rating" },
            ].map(({ label, key }) => {
              const vals = reviews
                .map((r) => (r as any)[key])
                .filter((v) => v != null);
              const avg = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
              return (
                <div key={key}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium">{avg > 0 ? avg.toFixed(1) : "–"}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StarRating rating={review.overall_rating} />
                <Badge variant="outline" className="text-xs capitalize">
                  {review.review_type.replace("_", " ")}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(review.created_at), "MMM d, yyyy")}
              </span>
            </div>
            {review.comment && (
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
