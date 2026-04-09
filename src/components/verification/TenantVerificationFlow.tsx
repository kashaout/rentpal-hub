import { useState } from "react";
import { User, Upload, CreditCard, FileText, ArrowRight, ArrowLeft, Check, Loader2, Home, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSubmitVerification, useUploadVerificationDoc, VerificationType } from "@/hooks/useVerification";
import { toast } from "sonner";

interface TenantVerificationFlowProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function TenantVerificationFlow({ onComplete, onCancel }: TenantVerificationFlowProps) {
  const [tenantType, setTenantType] = useState<"short_term" | "long_term" | null>(null);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    employer: "",
    monthly_income: "",
    previous_landlord_name: "",
    previous_landlord_phone: "",
    rental_history_notes: "",
  });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [incomeProofFile, setIncomeProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitVerification = useSubmitVerification();
  const uploadDoc = useUploadVerificationDoc();

  const shortTermSteps = [
    { icon: Home, title: "Tenant Type" },
    { icon: User, title: "Personal Info" },
    { icon: FileText, title: "ID Verification" },
    { icon: CreditCard, title: "Payment Method" },
    { icon: Check, title: "Review" },
  ];

  const longTermSteps = [
    { icon: Home, title: "Tenant Type" },
    { icon: User, title: "Personal Info" },
    { icon: FileText, title: "ID Verification" },
    { icon: CreditCard, title: "Income & Employment" },
    { icon: Clock, title: "Rental History" },
    { icon: Check, title: "Review" },
  ];

  const steps = tenantType === "long_term" ? longTermSteps : shortTermSteps;

  const handleSubmit = async () => {
    if (!tenantType) return;
    setIsSubmitting(true);
    try {
      const paths: string[] = [];
      if (idFile) paths.push(await uploadDoc.mutateAsync(idFile));
      if (incomeProofFile) paths.push(await uploadDoc.mutateAsync(incomeProofFile));

      const vType: VerificationType = tenantType === "short_term" ? "tenant_short_term" : "tenant_long_term";

      await submitVerification.mutateAsync({
        verificationType: vType,
        submittedData: { ...formData, tenant_type: tenantType },
        documentPaths: paths,
      });

      toast.success("Verification submitted! We'll review it shortly.");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return !!tenantType;
    if (step === 1) return formData.full_name && formData.phone;
    if (step === 2) return !!idFile;
    return true;
  };

  const isLastStep = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 shadow-elevated max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-8 pb-6 px-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Tenant Verification 🔑</h2>
            <p className="text-sm text-muted-foreground">Verify your identity to apply for properties</p>
          </div>

          {/* Progress */}
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-muted"}`} />
            ))}
          </div>

          <div className="text-center">
            <Badge variant="secondary">{steps[step]?.title}</Badge>
          </div>

          {/* Step 0: Choose type */}
          {step === 0 && (
            <RadioGroup value={tenantType || ""} onValueChange={(v) => setTenantType(v as any)} className="space-y-3">
              <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${tenantType === "short_term" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                <RadioGroupItem value="short_term" className="mt-1" />
                <div>
                  <p className="font-medium">Short-Term (Airbnb-style)</p>
                  <p className="text-sm text-muted-foreground">Nightly or weekly stays. Quick ID verification and payment method check.</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${tenantType === "long_term" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                <RadioGroupItem value="long_term" className="mt-1" />
                <div>
                  <p className="font-medium">Long-Term Lease</p>
                  <p className="text-sm text-muted-foreground">Monthly or yearly lease. Requires income verification and rental references.</p>
                </div>
              </label>
            </RadioGroup>
          )}

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData(d => ({ ...d, full_name: e.target.value }))} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input value={formData.phone} onChange={(e) => setFormData(d => ({ ...d, phone: e.target.value }))} placeholder="+234..." />
              </div>
            </div>
          )}

          {/* Step 2: ID */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center space-y-3">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Upload a valid government-issued ID</p>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} className="max-w-xs mx-auto" />
                {idFile && <Badge variant="outline" className="text-xs">{idFile.name}</Badge>}
              </div>
            </div>
          )}

          {/* Short-term Step 3: Payment Method */}
          {tenantType === "short_term" && step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center space-y-3">
                <CreditCard className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Payment method will be verified during booking checkout via Stripe.</p>
                <Badge variant="outline">✓ Verified at checkout</Badge>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  📝 Reviews/history import: <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                </p>
              </div>
            </div>
          )}

          {/* Long-term Step 3: Income */}
          {tenantType === "long_term" && step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Employer / Source of Income</Label>
                <Input value={formData.employer} onChange={(e) => setFormData(d => ({ ...d, employer: e.target.value }))} placeholder="ABC Company" />
              </div>
              <div className="space-y-2">
                <Label>Monthly Income (₦)</Label>
                <Input type="number" value={formData.monthly_income} onChange={(e) => setFormData(d => ({ ...d, monthly_income: e.target.value }))} placeholder="500000" />
              </div>
              <div className="space-y-2">
                <Label>Proof of Income (optional)</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setIncomeProofFile(e.target.files?.[0] || null)} />
                {incomeProofFile && <Badge variant="outline" className="text-xs">{incomeProofFile.name}</Badge>}
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  🔍 Credit/background check: <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                </p>
              </div>
            </div>
          )}

          {/* Long-term Step 4: Rental History */}
          {tenantType === "long_term" && step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Previous Landlord Name (optional)</Label>
                <Input value={formData.previous_landlord_name} onChange={(e) => setFormData(d => ({ ...d, previous_landlord_name: e.target.value }))} placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label>Previous Landlord Phone (optional)</Label>
                <Input value={formData.previous_landlord_phone} onChange={(e) => setFormData(d => ({ ...d, previous_landlord_phone: e.target.value }))} placeholder="+234..." />
              </div>
              <div className="space-y-2">
                <Label>Additional Notes (optional)</Label>
                <Textarea value={formData.rental_history_notes} onChange={(e) => setFormData(d => ({ ...d, rental_history_notes: e.target.value }))} placeholder="Any relevant rental history..." rows={3} />
              </div>
            </div>
          )}

          {/* Review Step (last step for both types) */}
          {isLastStep && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border p-4 space-y-2">
                <p><span className="font-medium">Type:</span> {tenantType === "short_term" ? "Short-Term" : "Long-Term"}</p>
                <p><span className="font-medium">Name:</span> {formData.full_name}</p>
                <p><span className="font-medium">Phone:</span> {formData.phone}</p>
                <p><span className="font-medium">ID:</span> {idFile?.name}</p>
                {tenantType === "long_term" && formData.employer && (
                  <p><span className="font-medium">Employer:</span> {formData.employer}</p>
                )}
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  ⏳ Our team will review your submission and notify you once verified.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
            </Button>
            {isLastStep ? (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-1">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Submit for Review
              </Button>
            ) : (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="gap-1">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
