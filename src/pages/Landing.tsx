import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Home, Building2, Users, Wrench, FileText, BarChart3, Shield, DollarSign,
  CheckCircle2, ArrowRight, Menu, X, ChevronRight, Star, Zap, Crown,
  Lock, Clock, AlertTriangle, Folder, ClipboardCheck, Phone, Mail, MapPin,
  Facebook, Twitter, Linkedin, Instagram, Check, XIcon
} from "lucide-react";
import heroImg from "@/assets/hero-property.jpg";
import dashboardImg from "@/assets/dashboard-preview.jpg";
import logoImg from "@/assets/rentpal-logo.png";
import { PLAN_CONFIGS, type SubscriptionPlan } from "@/hooks/useSubscription";
import { PublicHelpWidget } from "@/components/PublicHelpWidget";

const APP_AUTH_URL = "/auth";

const NAV_LINKS = [
  { label: "Properties", href: "/properties" },
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "/about" },
  { label: "Help", href: "/help" },
  { label: "Contact", href: "/contact" },
];

const PROBLEMS = [
  { icon: Clock, title: "Chasing Rent", desc: "Stop sending awkward messages. Automate reminders and track every payment." },
  { icon: AlertTriangle, title: "Maintenance Chaos", desc: "No more lost repair requests. A Kanban board keeps every issue visible." },
  { icon: Folder, title: "Lost Documents", desc: "Leases, certificates, receipts — all stored, organised, and searchable." },
  { icon: BarChart3, title: "Spreadsheet Overload", desc: "Ditch the spreadsheets. Real-time dashboards show the full financial picture." },
];

const FEATURES = [
  { icon: Building2, title: "Property Command Center", desc: "Every property detail, tenant, payment, and document in one unified view. Manage your entire portfolio from a single hub." },
  { icon: Wrench, title: "Maintenance Board", desc: "Kanban-style tracking from request to resolution. Assign technicians, track SLAs, and keep tenants informed." },
  { icon: DollarSign, title: "Financials & Escrow", desc: "Rent collection, expense tracking, escrow management, and financial statements — all automated." },
  { icon: FileText, title: "Documents & Compliance", desc: "Store leases, permits, and certificates. Get alerts before anything expires." },
];

const STEPS = [
  { num: "1", title: "Add Properties", desc: "List your properties with details, photos, and unit information in minutes." },
  { num: "2", title: "Manage Tenants & Maintenance", desc: "Onboard tenants, handle lease agreements, and track maintenance from one place." },
  { num: "3", title: "Track Payments & Reports", desc: "Monitor rent collection, generate financial reports, and grow your portfolio." },
];

const FAQS = [
  { q: "How quickly can I get started?", a: "You can set up your first property and tenant in under 10 minutes. Our guided onboarding walks you through every step." },
  { q: "Is my data safe?", a: "Absolutely. We use bank-grade encryption, secure cloud infrastructure, and strict access controls to protect your data." },
  { q: "Can tenants access the platform?", a: "Yes. Tenants get their own portal to view lease details, make payments, submit maintenance requests, and communicate with you." },
  { q: "Do you support multiple properties?", a: "Yes. Our plans scale from 3 properties on the free tier to unlimited on the Business plan." },
  { q: "What payment methods do you accept?", a: "We process subscriptions via Stripe. Rent payments within the app support bank transfers, cards, and escrow." },
  { q: "Can I cancel anytime?", a: "Yes. There are no long-term contracts. You can upgrade, downgrade, or cancel at any time." },
];

const PLAN_ORDER: SubscriptionPlan[] = ["free", "basic", "pro", "business"];
const PLAN_ICONS: Record<SubscriptionPlan, React.ReactNode> = {
  free: <Building2 className="h-6 w-6" />,
  basic: <Building2 className="h-6 w-6" />,
  pro: <Zap className="h-6 w-6" />,
  business: <Crown className="h-6 w-6" />,
};
const FEATURE_LABELS: Record<string, string> = {
  compliance_tracker: "Compliance Tracker",
  automation_workflows: "Automation Workflows",
  advanced_reports: "Advanced Reports",
  ai_insights: "AI Insights",
  multi_user: "Multi-User Access",
};

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="RentPal" className="h-8 w-8" />
            <span className="font-extrabold text-xl text-foreground">RentPal</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map(l =>
              l.href.startsWith("#") ? (
                <a key={l.label} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>
              ) : (
                <Link key={l.label} to={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
              )
            )}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link to={APP_AUTH_URL}>
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to={APP_AUTH_URL}>
              <Button size="sm" className="gap-1">Sign Up <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          </div>

          <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t bg-background px-4 py-4 space-y-3">
            {NAV_LINKS.map(l =>
              l.href.startsWith("#") ? (
                <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-muted-foreground">{l.label}</a>
              ) : (
                <Link key={l.label} to={l.href} onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-muted-foreground">{l.label}</Link>
              )
            )}
            <div className="flex gap-2 pt-2">
              <Link to={APP_AUTH_URL} className="flex-1"><Button variant="outline" className="w-full" size="sm">Login</Button></Link>
              <Link to={APP_AUTH_URL} className="flex-1"><Button className="w-full" size="sm">Sign Up</Button></Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Modern residential property" className="h-full w-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">Property Operations Platform</Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Manage your properties <span className="text-gradient">like a pro</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              RentPal is the all-in-one platform for landlords and property managers to manage tenants, maintenance, documents, and finances in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to={APP_AUTH_URL}>
                <Button size="lg" className="gap-2 text-base h-12 px-8">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button variant="outline" size="lg" className="gap-2 text-base h-12 px-8">
                  View Plans
                </Button>
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> Free plan available</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> No credit card required</span>
            </div>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-20 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Who This Is For</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">Whether you own a single rental or manage hundreds of units, RentPal adapts to your needs.</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Home, title: "Landlords", desc: "Individual property owners who want stress-free management." },
              { icon: Users, title: "Property Managers", desc: "Professionals handling multiple properties for clients." },
              { icon: BarChart3, title: "Real Estate Investors", desc: "Portfolio owners tracking ROI and performance." },
              { icon: ClipboardCheck, title: "Consultants", desc: "Advisory professionals overseeing property operations." },
            ].map(item => (
              <Card key={item.title} className="text-center border-none shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="pt-8 pb-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Problems We Eliminate */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Problems We Eliminate</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">Say goodbye to the headaches that come with property management.</p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEMS.map(p => (
              <div key={p.title} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <p.icon className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-lg">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">How It Works</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">Get up and running in three simple steps.</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-extrabold">
                  {s.num}
                </div>
                <h3 className="font-bold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">{s.desc}</p>
                {i < 2 && <ChevronRight className="hidden sm:block absolute top-8 -right-4 h-8 w-8 text-muted-foreground/30" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Powerful Features</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">Everything you need to run your property business efficiently.</p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {FEATURES.map(f => (
              <Card key={f.title} className="overflow-hidden border-none shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="p-8 flex gap-5">
                  <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">See It In Action</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">A clean, intuitive dashboard designed for property professionals.</p>
          <div className="mt-12 rounded-2xl overflow-hidden shadow-elevated border max-w-4xl mx-auto">
            <img src={dashboardImg} alt="RentPal Dashboard Preview" loading="lazy" width={1280} height={800} className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">Start free. Upgrade as you grow. No hidden fees.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_ORDER.map(planKey => {
              const plan = PLAN_CONFIGS[planKey];
              const isPro = planKey === "pro";
              return (
                <Card key={planKey} className={`relative ${isPro ? "border-primary shadow-lg scale-[1.02]" : "shadow-card"}`}>
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                    </div>
                  )}
                  <CardContent className="pt-8 pb-6 text-center">
                    <div className={`mx-auto mb-3 p-2 rounded-full w-fit ${isPro ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {PLAN_ICONS[planKey]}
                    </div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 min-h-[40px]">{plan.description}</p>
                    <div className="my-4">
                      <span className="text-4xl font-extrabold">{plan.price === 0 ? "Free" : `₦${plan.price.toLocaleString()}`}</span>
                      {plan.price > 0 && <span className="text-muted-foreground">/mo</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Up to <strong>{plan.property_limit === 999 ? "Unlimited" : plan.property_limit}</strong> properties
                    </p>
                    <ul className="space-y-2 text-sm text-left mb-6">
                      {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                        const has = plan.features[key as keyof typeof plan.features];
                        return (
                          <li key={key} className={`flex items-center gap-2 ${!has ? "text-muted-foreground" : ""}`}>
                            {has ? <Check className="h-4 w-4 text-primary" /> : <XIcon className="h-4 w-4" />}
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                    <Link to={APP_AUTH_URL}>
                      <Button className="w-full" variant={isPro ? "default" : "secondary"}>
                        {planKey === "free" ? "Get Started Free" : "Subscribe"}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            All plans include: Dashboard, Properties, Tenants, Payments, and Documents management.
            <br />Payments processed securely via Stripe in Nigerian Naira (₦).
          </p>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-extrabold sm:text-4xl">Enterprise-Grade Security</h2>
              <p className="mt-4 text-muted-foreground">Your data is protected with the same security standards used by financial institutions.</p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: Shield, title: "Bank-Grade Encryption", desc: "All data encrypted at rest and in transit." },
                  { icon: Lock, title: "Row-Level Security", desc: "Users only see data they're authorized to access." },
                  { icon: CheckCircle2, title: "Audit Logging", desc: "Every action tracked for compliance and transparency." },
                ].map(item => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative h-64 w-64">
                <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
                <div className="absolute inset-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-20 w-20 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-semibold">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Ready to simplify property management?</h2>
          <p className="mt-4 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Join landlords and property managers who've ditched spreadsheets for RentPal.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to={APP_AUTH_URL}>
              <Button size="lg" variant="secondary" className="gap-2 text-base h-12 px-8">
                Start Free Today <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logoImg} alt="RentPal" className="h-6 w-6" />
                <span className="font-bold text-foreground">RentPal</span>
              </div>
              <p className="text-sm text-muted-foreground">The complete property management platform for modern landlords.</p>
              <div className="flex gap-3 mt-4">
                <a href="#" className="text-muted-foreground hover:text-foreground"><Facebook className="h-5 w-5" /></a>
                <a href="#" className="text-muted-foreground hover:text-foreground"><Twitter className="h-5 w-5" /></a>
                <a href="#" className="text-muted-foreground hover:text-foreground"><Linkedin className="h-5 w-5" /></a>
                <a href="#" className="text-muted-foreground hover:text-foreground"><Instagram className="h-5 w-5" /></a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground">About</Link></li>
                <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
                <li><Link to="/help" className="hover:text-foreground">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              </ul>
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> support@rentpal.app</p>
                <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> +234 800 RENTPAL</p>
                <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Lagos, Nigeria</p>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            © 2026 RentPal. All rights reserved.
          </div>
        </div>
      </footer>

      <PublicHelpWidget />
    </div>
  );
}
