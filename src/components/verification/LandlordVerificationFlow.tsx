import { useState } from "react";
import { Building2, Upload, MapPin, User, ArrowRight, ArrowLeft, Check, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubmitVerification, useUploadVerificationDoc } from "@/hooks/useVerification";
import { toast } from "sonner";

interface LandlordVerificationFlowProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function LandlordVerificationFlow({ onComplete, onCancel }: LandlordVerificationFlowProps) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    business_name: "",
    address: "",
    city: "",
    state: "",
    property_description: "",
  });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [ownershipFile, setOwnershipFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitVerification = useSubmitVerification();
  const uploadDoc = useUploadVerificationDoc();

  const steps = [
    { icon: User, title: "Personal Info" },
    { icon: FileText, title: "Government ID" },
    { icon: Building2, title: "Property Proof" },
    { icon: MapPin, title: "Address & Photos" },
    { icon: Check, title: "Review & Submit" },
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const paths: string[] = [];

      if (idFile) {
        const p = await uploadDoc.mutateAsync(idFile);
        paths.push(p);
      }
      if (ownershipFile) {
        const p = await uploadDoc.mutateAsync(ownershipFile);
        paths.push(p);
      }
      for (const f of photoFiles) {
        const p = await uploadDoc.mutateAsync(f);
        paths.push(p);
      }

      await submitVerification.mutateAsync({
        verificationType: "landlord",
        submittedData: formData,
        documentPaths: paths,
      });

      toast.success("Verification request submitted! We'll review it shortly.");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit verification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return formData.full_name && formData.phone;
      case 1: return !!idFile;
      case 2: return !!ownershipFile;
      case 3: return formData.address && formData.city && formData.state;
      default: return true;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 shadow-elevated max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-8 pb-6 px-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Landlord Verification 🏠</h2>
            <p className="text-sm text-muted-foreground">
              Verify your identity to start listing properties
            </p>
          </div>

          {/* Progress */}
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="text-center">
            <Badge variant="secondary">{steps[step].title}</Badge>
          </div>

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData(d => ({ ...d, full_name: e.target.value }))} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input value={formData.phone} onChange={(e) => setFormData(d => ({ ...d, phone: e.target.value }))} placeholder="+234..." />
              </div>
              <div className="space-y-2">
                <Label>Business Name (optional)</Label>
                <Input value={formData.business_name} onChange={(e) => setFormData(d => ({ ...d, business_name: e.target.value }))} placeholder="ABC Properties Ltd" />
              </div>
            </div>
          )}

          {/* Step 1: Government ID */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center space-y-3">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Upload a valid government-issued ID (National ID, Driver's License, International Passport)</p>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} className="max-w-xs mx-auto" />
                {idFile && <Badge variant="outline" className="text-xs">{idFile.name}</Badge>}
              </div>
            </div>
          )}

          {/* Step 2: Ownership Proof */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center space-y-3">
                <Building2 className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Upload proof of property ownership or management authority (deed, management contract, utility bill)</p>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setOwnershipFile(e.target.files?.[0] || null)} className="max-w-xs mx-auto" />
                {ownershipFile && <Badge variant="outline" className="text-xs">{ownershipFile.name}</Badge>}
              </div>
            </div>
          )}

          {/* Step 3: Address & Photos */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Property Address *</Label>
                <Input value={formData.address} onChange={(e) => setFormData(d => ({ ...d, address: e.target.value }))} placeholder="123 Main Street" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input value={formData.city} onChange={(e) => setFormData(d => ({ ...d, city: e.target.value }))} placeholder="Lagos" />
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Input value={formData.state} onChange={(e) => setFormData(d => ({ ...d, state: e.target.value }))} placeholder="Lagos" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Property Photos (optional)</Label>
                <Input type="file" accept="image/*" multiple onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))} />
                {photoFiles.length > 0 && <p className="text-xs text-muted-foreground">{photoFiles.length} photo(s) selected</p>}
              </div>
              <div className="space-y-2">
                <Label>Property Description (optional)</Label>
                <Textarea value={formData.property_description} onChange={(e) => setFormData(d => ({ ...d, property_description: e.target.value }))} placeholder="Brief description of your property..." rows={3} />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border p-4 space-y-2">
                <p><span className="font-medium">Name:</span> {formData.full_name}</p>
                <p><span className="font-medium">Phone:</span> {formData.phone}</p>
                {formData.business_name && <p><span className="font-medium">Business:</span> {formData.business_name}</p>}
                <p><span className="font-medium">Address:</span> {formData.address}, {formData.city}, {formData.state}</p>
                <p><span className="font-medium">ID Document:</span> {idFile?.name}</p>
                <p><span className="font-medium">Ownership Proof:</span> {ownershipFile?.name}</p>
                {photoFiles.length > 0 && <p><span className="font-medium">Photos:</span> {photoFiles.length} file(s)</p>}
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  ⏳ After submission, our team will review your documents. You'll be notified once approved. Background check: <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
            </Button>
            {step === 4 ? (
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
