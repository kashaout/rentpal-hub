import { useState, useMemo } from "react";
import { Building2, Users, Home, ArrowRight, ArrowLeft, Check, MapPin, CreditCard, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { LucideIcon } from "lucide-react";

interface OnboardingWizardProps {
  onComplete: () => void;
}

type UxRole = "landlord" | "tenant";

interface OnboardingStep {
  icon: LucideIcon;
  title: string;
  description: string;
  tip: string;
}

const landlordSteps: OnboardingStep[] = [
  {
    icon: Building2,
    title: "Add Your Properties",
    description: "Start by adding your rental properties. You'll need to verify your identity first before listing.",
    tip: "Go to Properties → Add Property. You'll be guided through landlord verification.",
  },
  {
    icon: Users,
    title: "Manage Tenants",
    description: "Once verified, add tenants, assign them to properties, and track their lease and payment status.",
    tip: "Go to Tenants → Add Tenant and link them to a property.",
  },
  {
    icon: CreditCard,
    title: "Track Payments & Finances",
    description: "Monitor rent collection, expenses, and financial performance across your portfolio.",
    tip: "Payments are tracked automatically when tenants pay via the portal.",
  },
  {
    icon: Wrench,
    title: "Handle Maintenance",
    description: "Tenants can submit maintenance requests. View and manage them on the Kanban board.",
    tip: "Go to Maintenance to see requests organized by status.",
  },
];

const tenantSteps: OnboardingStep[] = [
  {
    icon: MapPin,
    title: "Browse Properties",
    description: "Search and explore available rental properties listed by verified landlords.",
    tip: "Go to Browse Properties to find available listings.",
  },
  {
    icon: Home,
    title: "Apply & Verify",
    description: "When you find a property, you'll be asked to verify your identity. Short-term and long-term options available.",
    tip: "Verification is quick — just upload your ID and complete a few steps.",
  },
  {
    icon: CreditCard,
    title: "Payments & Lease",
    description: "View your lease details, make rent payments, and track your payment history.",
    tip: "Go to My Portal to see everything about your tenancy.",
  },
  {
    icon: Wrench,
    title: "Maintenance Requests",
    description: "Submit maintenance requests directly to your landlord and track their resolution.",
    tip: "Go to My Portal → Report Issue to create a maintenance request.",
  },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, refreshRoles } = useAuth();
  const [phase, setPhase] = useState<"role" | "tips">("role");
  const [uxRole, setUxRole] = useState<UxRole | null>(null);
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const steps = uxRole === "landlord" ? landlordSteps : tenantSteps;

  const handleRoleSelected = async () => {
    if (!uxRole || !user?.id) return;
    // Save UX role to profile — DB trigger auto-inserts into user_roles
    await supabase
      .from("profiles")
      .update({ ux_role: uxRole } as any)
      .eq("user_id", user.id);
    // Refresh client-side roles so RLS-gated mutations work immediately
    await refreshRoles();
    setPhase("tips");
  };

  const handleComplete = async () => {
    setCompleting(true);
    if (user?.id) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("user_id", user.id);
    }
    setCompleting(false);
    onComplete();
  };

  if (phase === "role") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Card className="w-full max-w-lg mx-4 shadow-elevated">
          <CardContent className="pt-8 pb-6 px-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Welcome to RentPal! 🏠</h2>
              <p className="text-sm text-muted-foreground">
                Tell us how you plan to use RentPal so we can personalize your experience.
              </p>
              <p className="text-xs text-muted-foreground">You can change this anytime in Settings.</p>
            </div>

            <RadioGroup value={uxRole || ""} onValueChange={(v) => setUxRole(v as UxRole)} className="space-y-3">
              <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${uxRole === "landlord" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                <RadioGroupItem value="landlord" className="mt-1" />
                <div>
                  <p className="font-medium">I'm a Landlord / Property Manager</p>
                  <p className="text-sm text-muted-foreground">I want to list and manage rental properties, tenants, and payments.</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${uxRole === "tenant" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                <RadioGroupItem value="tenant" className="mt-1" />
                <div>
                  <p className="font-medium">I'm a Tenant / Renter</p>
                  <p className="text-sm text-muted-foreground">I want to find properties, pay rent, and manage my tenancy.</p>
                </div>
              </label>
            </RadioGroup>

            <Button onClick={handleRoleSelected} disabled={!uxRole} className="w-full gap-2">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>

            <button onClick={handleComplete} className="block mx-auto text-xs text-muted-foreground hover:text-foreground underline">
              Skip onboarding
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 shadow-elevated">
        <CardContent className="pt-8 pb-6 px-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {uxRole === "landlord" ? "Landlord" : "Tenant"} Quick Start 🚀
            </h2>
            <Badge variant="secondary" className="text-xs">{step + 1} / {steps.length}</Badge>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-muted"}`} />
            ))}
          </div>

          {/* Step content */}
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{current.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{current.description}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">💡 {current.tip}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => step === 0 ? setPhase("role") : setStep(s => s - 1)} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {isLast ? (
              <Button onClick={handleComplete} disabled={completing} className="gap-1">
                <Check className="h-4 w-4" /> Get Started
              </Button>
            ) : (
              <Button onClick={() => setStep(s => s + 1)} className="gap-1">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <button onClick={handleComplete} className="block mx-auto text-xs text-muted-foreground hover:text-foreground underline">
            Skip onboarding
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
