import { Loader2, Wifi, KeyRound, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLeaseCredentials } from "@/hooks/useLeaseCredentials";

interface Props {
  leaseId?: string;
  bothSigned: boolean;
}

export function TenantCodesTab({ leaseId, bothSigned }: Props) {
  const { data: credentials, isLoading } = useLeaseCredentials(leaseId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bothSigned) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Lease not fully signed</p>
          <p className="text-sm text-muted-foreground mt-1">
            Both you and your landlord must sign the lease before access codes are released.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!credentials || (!credentials.wifi_password && !credentials.keybox_password)) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Codes not yet available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Access codes will appear here 12 hours before your check-in time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {credentials.wifi_password && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold uppercase tracking-wider">WiFi Password</p>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] ml-auto">
                Active
              </Badge>
            </div>
            <p className="font-mono text-lg font-bold break-all select-all">
              {credentials.wifi_password}
            </p>
          </CardContent>
        </Card>
      )}
      {credentials.keybox_password && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold uppercase tracking-wider">Door / Keybox Code</p>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] ml-auto">
                Active
              </Badge>
            </div>
            <p className="font-mono text-lg font-bold break-all select-all">
              {credentials.keybox_password}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
