import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Mail, Lock, User, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type AppRole = "admin" | "consultant" | "landlord" | "tenant";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("landlord");
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();

  // Check rate limit on mount and periodically
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
    const interval = setInterval(checkLimit, 30000); // Re-check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limit before attempting auth
    const { allowed, message } = checkRateLimit();
    if (!allowed) {
      setRateLimitError(message);
      toast({
        title: "Rate limit exceeded",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Record the attempt before making the request
      recordAttempt();
      
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          // Update remaining attempts after failed login
          const { remainingAttempts: remaining, message: limitMsg } = checkRateLimit();
          setRemainingAttempts(remaining);
          if (remaining <= 2 && remaining > 0) {
            setRateLimitError(`Warning: ${remaining} attempt${remaining > 1 ? 's' : ''} remaining before temporary lockout.`);
          } else if (!remaining) {
            setRateLimitError(limitMsg);
          }
          
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          // Reset rate limit on successful login
          resetRateLimit();
          toast({ title: "Welcome back!" });
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password, fullName, role);
        if (error) {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          resetRateLimit();
          toast({ title: "Account created successfully!" });
          navigate("/");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden w-1/2 bg-gradient-slate p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-warm">
            <Home className="h-6 w-6 text-accent-foreground" />
          </div>
          <span className="font-display text-2xl font-bold text-primary-foreground">
            PropManage
          </span>
        </div>

        <div className="space-y-6">
          <h1 className="font-display text-4xl font-bold leading-tight text-primary-foreground">
            Simplify your
            <br />
            property management
          </h1>
          <p className="text-lg text-primary-foreground/70">
            Manage properties, tenants, and payments all in one place.
            Built for landlords, consultants, and property managers.
          </p>
        </div>

        <p className="text-sm text-primary-foreground/50">
          © 2026 PropManage. All rights reserved.
        </p>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-warm">
              <Home className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-display text-xl font-bold">PropManage</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-3xl font-bold text-foreground">
              {isLogin ? "Welcome back" : "Create an account"}
            </h2>
            <p className="text-muted-foreground">
              {isLogin
                ? "Enter your credentials to access your dashboard"
                : "Get started with your property management journey"}
            </p>
          </div>

          {rateLimitError && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>{rateLimitError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="role">I am a...</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landlord">Landlord</SelectItem>
                    <SelectItem value="consultant">Property Consultant</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? (
                "Please wait..."
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
