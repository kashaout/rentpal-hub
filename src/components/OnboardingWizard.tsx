import { useState, useMemo } from "react";
import { Building2, Users, Wrench, BarChart3, Shield, Zap, Check, ArrowRight, ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, PLAN_CONFIGS } from "@/hooks/useSubscription";
import type { LucideIcon } from "lucide-react";

interface OnboardingWizardProps {
  onComplete: () => void;
}

interface OnboardingStep {
  icon: LucideIcon;
  title: string;
  description: string;
  tip: string;
  requiredPlan?: string;
}

const allSteps: OnboardingStep[] = [
  {
    icon: Building2,
    title: "Add Your Properties",
    description: "Start by adding your rental properties with addresses, unit counts, rent amounts, and photos.",
    tip: "Go to Properties → Add Property to get started.",
  },
  {
    icon: Users,
    title: "Add Your Tenants",
    description: "Add tenants with their lease details, unit assignments, and payment schedules.",
    tip: "Go to Tenants → Add Tenant and link them to a property.",
  },
  {
    icon: FileText,
    title: "Manage Documents",
    description: "Upload and organize lease agreements, ID documents, and property records in one place.",
    tip: "Open any property or tenant to upload and manage documents.",
  },
  {
    icon: Wrench,
    title: "Track Maintenance",
    description: "Tenants can submit maintenance requests. View and manage them on the Maintenance Kanban board.",
    tip: "Go to Maintenance to see all requests organized by status.",
    requiredPlan: "basic",
  },
  {
    icon: BarChart3,
    title: "Financial Intelligence",
    description: "Track rent payments, expenses, and view P&L, cashflow, and ROI analytics with AI-powered insights.",
    tip: "Go to Financials to see your financial dashboard and generate statements.",
    requiredPlan: "pro",
  },
  {
    icon: Shield,
    title: "Reports & Analytics",
    description: "Access detailed reports on occupancy, maintenance performance, revenue trends, and tenant reviews.",
    tip: "Go to Reports for comprehensive analytics across your portfolio.",
    requiredPlan: "pro",
  },
  {
    icon: Zap,
    title: "Automation & Consultants",
    description: "Set up automated workflows for overdue rent, lease expiry, and compliance alerts. Assign consultants to properties.",
    tip: "Go to Settings → Automation to create your first workflow.",
    requiredPlan: "business",
  },
];

const planOrder = ["free", "basic", "pro", "business"];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useAuth();
  const { data: subscription } = useSubscription();
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const currentPlan = subscription?.plan || "free";

  const steps = useMemo(() => {
    const planIndex = planOrder.indexOf(currentPlan);
    return allSteps.filter((s) => {
      if (!s.requiredPlan) return true;
      return planOrder.indexOf(s.requiredPlan) <= planIndex;
    });
  }, [currentPlan]);

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
  const planConfig = PLAN_CONFIGS[currentPlan];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 shadow-elevated">
        <CardContent className="pt-8 pb-6 px-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Welcome to RentPal! 🏠</h2>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm text-muted-foreground">
                Let's set up your <span className="font-medium text-foreground">{planConfig.name}</span> plan
              </p>
              <Badge variant="secondary" className="text-xs">{steps.length} steps</Badge>
            </div>
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
