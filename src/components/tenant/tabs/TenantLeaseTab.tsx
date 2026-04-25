import { Loader2, FileText } from "lucide-react";
import { useMyLeaseAgreements } from "@/hooks/useLeaseAgreements";
import { TenantLeaseInfo } from "@/hooks/useTenantPortal";
import { LeaseTemplateViewer } from "../LeaseTemplateViewer";

interface Props {
  lease: TenantLeaseInfo;
}

export function TenantLeaseTab({ lease }: Props) {
  const { data: agreements = [], isLoading } = useMyLeaseAgreements();
  const agreement = agreements.find((item) => item.property_id === lease.property_id) ?? agreements[0];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">No lease agreement yet.</p>
      </div>
    );
  }

  return <LeaseTemplateViewer agreement={agreement} onBack={() => {}} />;
}
