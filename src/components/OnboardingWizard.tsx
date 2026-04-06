import { useState } from "react";
import { Building2, Users, Wrench, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Building2,
    title: "Add Your Properties",
    description: "Start by adding your rental properties. You can add addresses, unit counts, rent amounts, and photos.",
    tip: "Go to Properties → Add Property to get started.",
  },
  {
    icon: Users,
    title: "Add Your Tenants",
    description: "Once properties are set up, add tenants with their lease details, unit assignments, and payment schedules.",
    tip: "Go to Tenants → Add Tenant and link them to a property.",
  },
  {
    icon: Wrench,
    title: "Track Maintenance & Finances",
    description: "Tenants can submit maintenance requests. You'll see them on the Maintenance board. Track rent payments and expenses in Financials.",
    tip: "Upgrade your plan to unlock Maintenance, Financials, and Reports.",
  },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

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

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 shadow-elevated">
        <CardContent className="pt-8 pb-6 px-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Welcome to RentPal! 🏠</h2>
            <p className="text-sm text-muted-foreground">Let's get you set up in 3 simple steps</p>
          </div>

          {/* Progress dots */}
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
            <Button
              variant="ghost"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="gap-1"
            >
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

          <button
            onClick={handleComplete}
            className="block mx-auto text-xs text-muted-foreground hover:text-foreground underline"
          >
            Skip onboarding
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
