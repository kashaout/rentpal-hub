import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { useRentPayment } from "@/hooks/useStripeSubscription";
import { useMyReviews, useCreateReview } from "@/hooks/useReviews";
import {
  Building2,
  Calendar,
  Banknote,
  Wrench,
  Receipt,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTenantLease } from "@/hooks/useTenantPortal";
import { usePaymentsByTenant } from "@/hooks/usePayments";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { useAuth } from "@/hooks/useAuth";
import { MaintenanceRequestDialog } from "./MaintenanceRequestDialog";
import { RateMaintenanceDialog } from "./RateMaintenanceDialog";
import { cn } from "@/lib/utils";

const paymentStatusStyles: Record<string, string> = {
  paid: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

const paymentStatusConfig: Record<string, { icon: typeof CheckCircle2 }> = {
  completed: { icon: CheckCircle2 },
  pending: { icon: Clock },
  failed: { icon: AlertCircle },
  refunded: { icon: AlertTriangle },
};

const requestStatusStyles: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-accent/10 text-accent border-accent/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

const priorityStyles: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/10 text-primary",
  high: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

export function TenantPortal() {
  const { user } = useAuth();
  const { payRent, isLoading: rentPaymentLoading } = useRentPayment();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [ratingRequest, setRatingRequest] = useState<{ id: string; title: string } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const createReview = useCreateReview();

  const { data: lease, isLoading: leaseLoading } = useTenantLease();
  const { data: payments, isLoading: paymentsLoading } = usePaymentsByTenant(lease?.id || "");
  const { data: requests, isLoading: requestsLoading } = useMaintenanceRequests(lease?.id);
  const { data: myReviews = [] } = useMyReviews();

  const isLoading = leaseLoading || paymentsLoading || requestsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">No Active Lease</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have an active lease associated with your account.
          </p>
        </div>
      </div>
    );
  }

  const daysUntilLeaseEnd = differenceInDays(new Date(lease.lease_end), new Date());
  const isLeaseExpired = daysUntilLeaseEnd <= 0;
  const totalPaid = payments?.filter((p) => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const isRentPaid = lease.payment_status === "paid";
  const hasReviewedProperty = myReviews.some((r) => r.property_id === lease.property_id);
  const showReviewPrompt = isLeaseExpired && !hasReviewedProperty;
  const handleSubmitReview = async () => {
    if (reviewRating === 0) return;
    await createReview.mutateAsync({
      property_id: lease.property_id,
      review_type: "property",
      overall_rating: reviewRating,
      comment: reviewComment || undefined,
    });
    setReviewOpen(false);
    setReviewRating(0);
    setReviewComment("");
  };

  return (
    <div className="space-y-6 p-6">
      {/* Lease Expiry Review Prompt */}
      {showReviewPrompt && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Star className="h-6 w-6 text-warning" />
              <div>
                <p className="font-medium">Your tenancy has ended</p>
                <p className="text-sm text-muted-foreground">Share your experience by leaving a review for {lease.property_name}</p>
              </div>
            </div>
            <Button onClick={() => setReviewOpen(true)} className="gap-2">
              <Star className="h-4 w-4" />
              Leave Review
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lease Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Property
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{lease.property_name}</p>
            <p className="text-sm text-muted-foreground">Unit {lease.unit_number}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Rent
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦{lease.rent_amount.toLocaleString()}</p>
            <Badge
              variant="outline"
              className={cn("mt-1", paymentStatusStyles[lease.payment_status])}
            >
              {lease.payment_status}
            </Badge>
            {isRentPaid ? (
              <Badge variant="outline" className="mt-2 w-full justify-center gap-1 bg-success/10 text-success border-success/20">
                <CheckCircle2 className="h-3 w-3" />
                Rent Paid for This Period
              </Badge>
            ) : (
              <Button
                size="sm"
                className="mt-2 w-full gap-1"
                disabled={rentPaymentLoading}
                onClick={() =>
                  payRent({
                    amount: lease.rent_amount,
                    currency: "NGN",
                    tenantId: lease.id,
                    propertyName: lease.property_name,
                    unitNumber: lease.unit_number,
                  })
                }
              >
                {rentPaymentLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Banknote className="h-3 w-3" />
                )}
                Pay Rent Online
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lease Period
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {format(new Date(lease.lease_start), "MMM d, yyyy")} -{" "}
              {format(new Date(lease.lease_end), "MMM d, yyyy")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {daysUntilLeaseEnd > 0
                ? `${daysUntilLeaseEnd} days remaining`
                : "Lease expired"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              {payments?.length || 0} payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.slice(0, 5).map((payment) => {
                    const StatusIcon = paymentStatusConfig[payment.status]?.icon || Clock;
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.payment_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${Number(payment.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground capitalize">
                          {payment.payment_method?.replace("_", " ") || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No payment history yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Requests
          </CardTitle>
          <Button onClick={() => setRequestDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </CardHeader>
        <CardContent>
          {requests && requests.length > 0 ? (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{request.title}</h4>
                      <Badge
                        variant="outline"
                        className={cn("capitalize text-xs", priorityStyles[request.priority])}
                      >
                        {request.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {request.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {format(new Date(request.created_at), "MMM d, yyyy")}
                    </p>
                    {request.status === "completed" && request.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "h-3 w-3",
                              star <= request.rating!
                                ? "fill-warning text-warning"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 capitalize", requestStatusStyles[request.status])}
                    >
                      {request.status.replace("_", " ")}
                    </Badge>
                    {request.status === "completed" && !request.rating && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRatingRequest({ id: request.id, title: request.title })}
                        className="gap-1 text-xs"
                      >
                        <Star className="h-3 w-3" />
                        Rate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Wrench className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No maintenance requests yet.</p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => setRequestDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Submit Your First Request
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MaintenanceRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        tenantId={lease.id}
        propertyId={lease.property_id}
      />

      {ratingRequest && (
        <RateMaintenanceDialog
          open={!!ratingRequest}
          onOpenChange={(open) => !open && setRatingRequest(null)}
          requestId={ratingRequest.id}
          requestTitle={ratingRequest.title}
        />
      )}

      {/* Leave Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-warning" />
              Review {lease.property_name}
            </DialogTitle>
            <DialogDescription>
              How was your experience at this property?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">Overall Rating</Label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-9 w-9 transition-colors",
                        reviewRating >= star
                          ? "fill-warning text-warning"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Comment (optional)</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience..."
                className="mt-1 h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitReview} disabled={reviewRating === 0 || createReview.isPending}>
              {createReview.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
