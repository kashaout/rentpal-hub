import { FileText, Loader2 } from "lucide-react";
import { useMyLeaseAgreements } from "@/hooks/useLeaseAgreements";
import { LeaseTemplateViewer } from "./LeaseTemplateViewer";

/**
 * Tenant Lease page — renders the same lease document component used by landlords.
 */
export function TenantLeasePage() {
  const { data: leases = [], isLoading } = useMyLeaseAgreements();
  const lease = leases[0];

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">No lease yet</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Your lease agreement will appear here as soon as it is created.
        </p>
      </div>
    );
  }

  return <LeaseTemplateViewer agreement={lease} onBack={() => {}} />;
}
