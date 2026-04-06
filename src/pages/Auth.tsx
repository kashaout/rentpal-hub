import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Mail, Lock, User, ArrowRight, ShieldAlert, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { differenceInYears } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { checkRateLimit, recordAttempt, resetRateLimit } from "@/lib/rateLimiter";

type PublicAppRole = "landlord" | "tenant";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<PublicAppRole>("landlord");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dobError, setDobError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    const checkLimit = () => {
      const { allowed, message, remainingAttempts: remaining } = checkRateLimit();
      if (!allowed) {
        setRateLimitError(message);
      } else {
        setRateLimitError(null);
        setRemainingAttempts(remaining);
      }
    };
    checkLimit();
    const interval = setInterval(checkLimit, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { allowed, message } = checkRateLimit();
    if (!allowed) {
      setRateLimitError(message);
      toast({ title: "Rate limit exceeded", description: message, variant: "destructive" });
      return;
    }

    if (!isLogin) {
      if (!dateOfBirth) {
        setDobError("Date of birth is required.");
        return;
      }
      const age = differenceInYears(new Date(), new Date(dateOfBirth));
      if (age < 18) {
        setDobError("You must be at least 18 years old to use this platform.");
        toast({ title: "Age restriction", description: "You must be at least 18 years old.", variant: "destructive" });
        return;
      }
      setDobError(null);
    }

    setIsLoading(true);

    try {
      recordAttempt();

      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          const { remainingAttempts: remaining, message: limitMsg } = checkRateLimit();
          setRemainingAttempts(remaining);
          if (remaining <= 2 && remaining > 0) {
            setRateLimitError(`Warning: ${remaining} attempt${remaining > 1 ? 's' : ''} remaining before temporary lockout.`);
          } else if (!remaining) {
            setRateLimitError(limitMsg);
          }
          toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        } else {
          resetRateLimit();
          toast({ title: "Welcome back!" });
          navigate("/dashboard");
        }
      } else {
        const { error } = await signUp(email, password, fullName, role);
        if (error) {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        } else {
          resetRateLimit();
          toast({ title: "Account created successfully!" });
          navigate("/dashboard");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-foreground">
              RentPal
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card p-8 shadow-elevated">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {isLogin ? "Welcome back" : "Create an account"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to manage your properties"
                : "Get started with property management"}
            </p>
          </div>

          {rateLimitError && (
            <Alert variant="destructive" className="mb-4 border-destructive/50 bg-destructive/10">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>{rateLimitError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-semibold">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="fullName" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 rounded-xl" required />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 rounded-xl" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 rounded-xl" required minLength={6} />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="dob" className="text-sm font-semibold">Date of Birth</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => { setDateOfBirth(e.target.value); setDobError(null); }} className="pl-10 rounded-xl" required max={new Date().toISOString().split("T")[0]} />
                </div>
                {dobError && <p className="text-xs text-destructive">{dobError}</p>}
                <p className="text-xs text-muted-foreground">You must be at least 18 years old.</p>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-sm font-semibold">I am a...</Label>
                <Select value={role} onValueChange={(v) => setRole(v as PublicAppRole)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landlord">Landlord</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 font-semibold h-11"
              disabled={isLoading}
            >
              {isLoading ? "Please wait..." : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="font-semibold text-primary">
                {isLogin ? "Sign up" : "Sign in"}
              </span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 RentPal. All rights reserved.
        </p>
      </div>
    </div>
  );
}
