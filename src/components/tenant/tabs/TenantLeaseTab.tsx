import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Download, Mail, Wifi, Key } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLeaseCredentials } from "@/hooks/useLeaseCredentials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatCurrency";
import { printLeaseHtml, emailLeaseHtml } from "@/lib/leaseExport";
import { TenantLeaseInfo } from "@/hooks/useTenantPortal";
import { useToast } from "@/hooks/use-toast";

interface Props {
  lease: TenantLeaseInfo;
}

export function TenantLeaseTab({ lease }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [emailLoading, setEmailLoading] = useState(false);

  const { data: agreements, isLoading } = useQuery({
    queryKey: ["tenant-lease-agreements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_agreements")
        .select("*")
        .eq("tenant_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Find the active (both-signed) agreement for the current lease
  const activeAgreement = agreements?.find(
    (a) => a.tenant_signed && a.landlord_signed && a.property_id === lease.property_id
  );

  // Fetch credentials via RPC — only returns data when both signed + within 12h of check-in
  const { data: credentials } = useLeaseCredentials(activeAgreement?.id);

  const handleDownload = () => {
    if (!activeAgreement) return;
    printLeaseHtml(activeAgreement.terms || "No terms available");
  };

  const handleEmail = async () => {
    if (!activeAgreement || !user?.email) return;
    setEmailLoading(true);
    try {
      await emailLeaseHtml({ html: activeAgreement.terms || "No terms available", to: user.email });
      toast({ title: "Email sent", description: "Lease agreement sent to your email." });
    } catch {
      toast({ title: "Email failed", description: "Could not send lease email.", variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Current lease summary */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Current Lease</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Property</p>
              <p className="font-medium">{lease.property_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unit</p>
              <p className="font-medium">{lease.unit_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="font-medium">{format(new Date(lease.lease_start), "MMM d, yyyy")} – {format(new Date(lease.lease_end), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="font-medium">{formatCurrency(lease.rent_amount, "NGN")}</p>
            </div>
          </div>

          {/* Download / Email buttons for signed lease */}
          {activeAgreement && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEmail} disabled={emailLoading}>
                {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send to Email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WiFi & Door Codes — visible only when RPC returns data */}
      {credentials && (credentials.wifi_password || credentials.keybox_password) && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Key className="h-5 w-5" /> Access Codes</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {credentials.wifi_password && (
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <Wifi className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">WiFi Password</p>
                    <p className="font-mono font-medium">{credentials.wifi_password}</p>
                  </div>
                </div>
              )}
              {credentials.keybox_password && (
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <Key className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Door / Keybox Code</p>
                    <p className="font-mono font-medium">{credentials.keybox_password}</p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Codes are available 12 hours before check-in until 1 day after lease end.
            </p>
          </CardContent>
        </Card>
      )}

      {/* All lease agreements */}
      {agreements && agreements.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Lease Agreements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {agreements.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Unit {a.unit_number} – {formatCurrency(Number(a.rent_amount), a.currency)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(a.lease_start), "MMM d, yyyy")} – {format(new Date(a.lease_end), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{a.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    T:{a.tenant_signed ? "✓" : "✗"} L:{a.landlord_signed ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
