import { Wifi, KeyRound, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLeaseCredentials } from "@/hooks/useLeaseCredentials";

interface Props {
  leaseId?: string;
}

export function TenantCodesTab({ leaseId }: Props) {
  // Always call the hook — let the RPC decide whether codes are released.
  const { data: credentials, isLoading } = useLeaseCredentials(leaseId);

  const hasWifi = !!credentials?.wifi_password;
  const hasKey = !!credentials?.keybox_password;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={hasWifi ? "border-primary/20 bg-primary/5" : "border-dashed"}>
          <CardContent className="py-6">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className={`h-5 w-5 ${hasWifi ? "text-primary" : "text-muted-foreground/50"}`} />
              <p className="text-sm font-semibold uppercase tracking-wider">WiFi Password</p>
              {hasWifi && (
                <Badge variant="outline" className="text-[10px] ml-auto">Active</Badge>
              )}
            </div>
            {hasWifi ? (
              <p className="font-mono text-lg font-bold break-all select-all">
                {credentials!.wifi_password}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {isLoading ? "Checking access..." : "Not released yet"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={hasKey ? "border-primary/20 bg-primary/5" : "border-dashed"}>
          <CardContent className="py-6">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className={`h-5 w-5 ${hasKey ? "text-primary" : "text-muted-foreground/50"}`} />
              <p className="text-sm font-semibold uppercase tracking-wider">Door / Keybox Code</p>
              {hasKey && (
                <Badge variant="outline" className="text-[10px] ml-auto">Active</Badge>
              )}
            </div>
            {hasKey ? (
              <p className="font-mono text-lg font-bold break-all select-all">
                {credentials!.keybox_password}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {isLoading ? "Checking access..." : "Not released yet"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
