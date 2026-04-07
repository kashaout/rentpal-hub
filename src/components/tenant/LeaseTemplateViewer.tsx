import { format } from "date-fns";
import { ArrowLeft, Download, Pen, Loader2, FileText, KeyRound, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LeaseAgreement, useSignLeaseAgreement } from "@/hooks/useLeaseAgreements";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LeaseTemplateViewerProps {
  agreement: LeaseAgreement;
  onBack: () => void;
}

export function LeaseTemplateViewer({ agreement, onBack }: LeaseTemplateViewerProps) {
  // Fetch credentials securely via RPC instead of reading from agreement object
  const { data: credentials } = useQuery({
    queryKey: ["lease-credentials", agreement.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lease_credentials", {
        _lease_id: agreement.id,
      } as any);
      if (error) return null;
      return (data as any)?.[0] ?? null;
    },
    enabled: !!agreement.credentials_sent_at && agreement.tenant_signed && agreement.landlord_signed,
  });
  const { user, isTenant, isLandlord } = useAuth();
  const signAgreement = useSignLeaseAgreement();

  const isTenantParty = agreement.tenant_user_id === user?.id;
  const isLandlordParty = agreement.landlord_user_id === user?.id;
  const canSign =
    (isTenant && isTenantParty && !agreement.tenant_signed) ||
    (isLandlord && isLandlordParty && !agreement.landlord_signed);
  const role = isTenantParty ? "tenant" : "landlord";

  const leaseStartDate = new Date(agreement.lease_start);
  const leaseEndDate = new Date(agreement.lease_end);
  const leaseMonths = Math.max(1, Math.round((leaseEndDate.getTime() - leaseStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const totalRent = agreement.rent_amount * leaseMonths;
  const cautionDeposit = agreement.rent_amount * 2;
  const lateCharge = agreement.rent_amount * 0.1;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <a
          href="/documents/lease-agreement-template.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto"
        >
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF Template
          </Button>
        </a>
      </div>

      {/* Lease Document */}
      <div className="mx-auto max-w-3xl rounded-lg border bg-card p-8 md:p-12 shadow-sm print:shadow-none print:border-none">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-wide">TENANCY AGREEMENT</h1>
          <p className="text-sm text-muted-foreground">
            Made pursuant to the Lagos State Tenancy Law 2011 (as amended)
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
          {/* Preamble */}
          <p>
            THIS TENANCY AGREEMENT (hereinafter referred to as the "<strong>Agreement</strong>") is made and entered into
            this <strong>{format(leaseStartDate, "do")}</strong> day of <strong>{format(leaseStartDate, "MMMM, yyyy")}</strong>, by and between:
          </p>

          <div className="rounded-lg bg-secondary/50 p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Landlord</p>
              <p className="font-semibold text-foreground">{agreement.landlord_name}</p>
              <p className="text-muted-foreground text-xs">(hereinafter referred to as the "Landlord")</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Tenant</p>
              <p className="font-semibold text-foreground">{agreement.tenant_name}</p>
              <p className="text-muted-foreground text-xs">(hereinafter referred to as the "Tenant")</p>
            </div>
          </div>

          <p className="font-semibold uppercase tracking-wide text-center text-foreground">WITNESSETH:</p>

          <p>
            WHEREAS the Landlord is the owner/authorised agent of the property situate at and known as{" "}
            <strong>Unit {agreement.unit_number}</strong> (hereinafter referred to as the "Premises").
          </p>
          <p>
            WHEREAS the Landlord is desirous of letting the Premises to the Tenant upon the terms and conditions herein contained; and
          </p>
          <p>
            WHEREAS the Tenant is desirous of taking the Premises from the Landlord on the terms and conditions herein contained;
          </p>
          <p>
            NOW THEREFORE, in consideration of the mutual covenants and agreements herein, the parties agree as follows:
          </p>

          {/* Clause 1 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">1. TERM OF TENANCY</h2>
            <p>
              The Landlord hereby lets and the Tenant hereby takes the Premises for a term of{" "}
              <strong>{leaseMonths} month(s)</strong>, commencing on{" "}
              <strong>{format(leaseStartDate, "MMMM d, yyyy")}</strong> and expiring at midnight on{" "}
              <strong>{format(leaseEndDate, "MMMM d, yyyy")}</strong>.
            </p>
          </div>

          {/* Clause 2 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">2. RENT</h2>
            <p>
              The total rent for the term hereof is <strong>{formatCurrency(totalRent, agreement.currency)}</strong>{" "}
              (<strong>{agreement.currency}</strong>) payable in equal monthly instalments of{" "}
              <strong>{formatCurrency(agreement.rent_amount, agreement.currency)}</strong> on or before the{" "}
              <strong>1st</strong> day of each calendar month. The first instalment shall be paid upon execution of this Agreement.
              All payments shall be made to the Landlord or the Landlord's designated account.
            </p>
          </div>

          {/* Clause 3 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">3. CAUTION/SECURITY DEPOSIT</h2>
            <p>
              Upon execution of this Agreement, the Tenant shall deposit with the Landlord the sum of{" "}
              <strong>{formatCurrency(cautionDeposit, agreement.currency)}</strong> as caution/security deposit.
              This deposit shall be refundable (without interest) upon the expiration or termination of this Agreement,
              less any deductions for damages beyond normal wear and tear, unpaid rent, or outstanding utility bills.
            </p>
          </div>

          {/* Clause 4 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">4. USE OF PREMISES</h2>
            <p>
              The Premises shall be used exclusively as a private residential dwelling by the Tenant and the Tenant's
              immediate family. The Tenant shall not use the Premises for any commercial, trading, or illegal purpose
              without the prior written consent of the Landlord. The Tenant shall comply with all applicable laws,
              including the Lagos State Environmental Sanitation Law and all local government regulations.
            </p>
          </div>

          {/* Clause 5 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">5. CONDITION OF PREMISES</h2>
            <p>
              The Tenant acknowledges that the Premises have been inspected and are in a habitable, clean, and good
              condition at the commencement of this tenancy.
            </p>
          </div>

          {/* Clause 6 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">6. ASSIGNMENT AND SUB-LETTING</h2>
            <p>
              The Tenant shall not assign, sub-let, or part with possession of the Premises or any part thereof
              without the prior written consent of the Landlord. Any unauthorised assignment or sub-letting shall
              be void and shall entitle the Landlord to terminate this Agreement.
            </p>
          </div>

          {/* Clause 7 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">7. REPAIRS AND MAINTENANCE</h2>
            <p>
              The Landlord shall be responsible for structural repairs (roof, walls, foundation) and major installations.
              The Tenant shall maintain the Premises in good and tenantable condition, keep drains, pipes, and fittings
              in working order, and shall not make any structural alterations without the Landlord's written consent.
            </p>
          </div>

          {/* Clause 8 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">8. UTILITIES</h2>
            <p>
              The Tenant shall be responsible for payment of all utility bills including electricity (EKEDC/IKEDC/AEDC as applicable),
              water, waste disposal (LAWMA), internet, and any other services consumed at the Premises during the term of this tenancy.
            </p>
          </div>

          {/* Clause 9 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">9. LANDLORD'S RIGHT OF ENTRY</h2>
            <p>
              The Landlord or the Landlord's agent shall have the right to enter the Premises at reasonable times
              (with at least 24 hours' prior notice) for the purposes of inspection, repair, or showing the Premises
              to prospective tenants within the last 90 days of the tenancy.
            </p>
          </div>

          {/* Clause 10 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">10. DEFAULT AND TERMINATION</h2>
            <p>
              In accordance with Section 13 of the Lagos State Tenancy Law 2011, should the Tenant fail to pay rent
              or breach any material provision of this Agreement, the Landlord shall issue a written Notice to Quit
              giving the Tenant <strong>one (1) month's notice</strong> for a monthly tenancy, or such period as
              prescribed by law. Recovery of possession shall only be through the Courts as provided under the Law.
            </p>
          </div>

          {/* Clause 11 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">11. LATE PAYMENT CHARGE</h2>
            <p>
              If rent is not received within <strong>seven (7) days</strong> of the due date, a late fee of{" "}
              <strong>{formatCurrency(lateCharge, agreement.currency)}</strong> (10% of monthly rent) shall become payable in addition to the rent due.
            </p>
          </div>

          {/* Clause 12 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">12. QUIET ENJOYMENT</h2>
            <p>
              The Tenant, upon payment of rent and observance of the covenants herein, shall peacefully hold and enjoy
              the Premises without interruption by the Landlord or any person lawfully claiming through the Landlord.
            </p>
          </div>

          {/* Clause 13 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">13. SURRENDER OF PREMISES</h2>
            <p>
              Upon expiration or termination of this tenancy, the Tenant shall yield and deliver up the Premises in
              the same condition as received, reasonable wear and tear excepted, and shall return all keys to the Landlord.
            </p>
          </div>

          {/* Clause 14 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">14. GOVERNING LAW</h2>
            <p>
              This Agreement shall be governed by and construed in accordance with the <strong>Lagos State Tenancy Law 2011</strong>{" "}
              (as amended) and the Laws of the Federal Republic of Nigeria.
            </p>
          </div>

          {/* Clause 15 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">15. DISPUTE RESOLUTION</h2>
            <p>
              Any dispute arising from this Agreement shall first be resolved through mediation. If mediation fails,
              the matter shall be referred to the Lagos State Multi-Door Courthouse or the appropriate Magistrate's Court
              or High Court of Lagos State.
            </p>
          </div>

          {/* Clause 16 */}
          <div>
            <h2 className="font-bold text-foreground mb-1">16. ENTIRE AGREEMENT</h2>
            <p>
              This Agreement constitutes the entire understanding between the parties and shall not be modified except
              by a written instrument signed by both parties.
            </p>
          </div>

          <Separator className="my-6" />

          {/* Additional Terms */}
          {agreement.terms && agreement.terms !== "Standard lease agreement terms apply." && (
            <div>
              <h2 className="font-bold text-foreground mb-1">ADDITIONAL TERMS</h2>
              <p className="whitespace-pre-line">{agreement.terms}</p>
            </div>
          )}

          <Separator className="my-6" />

          {/* Signature Section */}
          <p className="text-center font-semibold text-foreground">
            IN WITNESS WHEREOF, the parties have executed this Agreement:
          </p>

          <div className="grid grid-cols-2 gap-8 mt-6">
            {/* Landlord Signature */}
            <div className="space-y-3">
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Landlord</p>
              <div className="border-b border-foreground/30 pb-1">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{agreement.landlord_name}</p>
              </div>
              <div className="border-b border-foreground/30 pb-1">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">
                  {agreement.landlord_signed_at
                    ? format(new Date(agreement.landlord_signed_at), "MMMM d, yyyy")
                    : "___________________"}
                </p>
              </div>
              <div className="border-b border-foreground/30 pb-1 min-h-[40px] flex items-end">
                <p className="text-xs text-muted-foreground">
                  {agreement.landlord_signed ? (
                    <span className="text-success font-medium">✓ Signed digitally</span>
                  ) : (
                    "Signature: ___________________"
                  )}
                </p>
              </div>
            </div>

            {/* Tenant Signature */}
            <div className="space-y-3">
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Tenant</p>
              <div className="border-b border-foreground/30 pb-1">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{agreement.tenant_name}</p>
              </div>
              <div className="border-b border-foreground/30 pb-1">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">
                  {agreement.tenant_signed_at
                    ? format(new Date(agreement.tenant_signed_at), "MMMM d, yyyy")
                    : "___________________"}
                </p>
              </div>
              <div className="border-b border-foreground/30 pb-1 min-h-[40px] flex items-end">
                <p className="text-xs text-muted-foreground">
                  {agreement.tenant_signed ? (
                    <span className="text-success font-medium">✓ Signed digitally</span>
                  ) : (
                    "Signature: ___________________"
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Access Credentials Section */}
        {agreement.credentials_sent_at && agreement.wifi_password && agreement.keybox_password && (
          <div className="mt-8">
            <Separator className="my-6" />
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-foreground text-lg">Access Credentials</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                These credentials were automatically generated and sent 12 hours before your check-in.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-card border p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">WiFi Password</p>
                  </div>
                  <p className="font-mono text-lg font-bold text-foreground tracking-wider select-all">
                    {agreement.wifi_password}
                  </p>
                </div>
                <div className="rounded-lg bg-card border p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Key Box Code</p>
                  </div>
                  <p className="font-mono text-lg font-bold text-foreground tracking-wider select-all">
                    {agreement.keybox_password}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Sent on: {format(new Date(agreement.credentials_sent_at), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sign button */}
      {canSign && (
        <div className="mx-auto max-w-3xl">
          <Button
            onClick={() => signAgreement.mutate({ agreementId: agreement.id, role })}
            disabled={signAgreement.isPending}
            className="w-full gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90 py-6 text-base"
          >
            {signAgreement.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Pen className="h-5 w-5" />
            )}
            Sign This Agreement
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            By clicking "Sign", you agree to be bound by the terms and conditions stated above.
          </p>
        </div>
      )}
    </div>
  );
}
