import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useVerificationStatus } from "@/hooks/useVerification";

export function VerificationStatusBanner() {
  const { data: requests } = useVerificationStatus();

  if (!requests?.length) return null;

  const latest = requests[0];

  if (latest.status === "approved") return null;

  const config = {
    pending: {
      icon: Clock,
      title: "Verification Pending",
      desc: "Your verification is being reviewed. You'll be notified once approved.",
      variant: "default" as const,
    },
    rejected: {
      icon: XCircle,
      title: "Verification Rejected",
      desc: latest.admin_notes
        ? `Your verification was rejected: ${latest.admin_notes}`
        : "Your verification was rejected. Please contact support or resubmit.",
      variant: "destructive" as const,
    },
    additional_info_needed: {
      icon: AlertCircle,
      title: "Additional Information Needed",
      desc: latest.admin_notes || "Please provide additional information for your verification.",
      variant: "default" as const,
    },
  };

  const c = config[latest.status as keyof typeof config];
  if (!c) return null;

  const Icon = c.icon;

  return (
    <Alert variant={c.variant} className="mb-4">
      <Icon className="h-4 w-4" />
      <AlertTitle>{c.title}</AlertTitle>
      <AlertDescription>{c.desc}</AlertDescription>
    </Alert>
  );
}
