import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Building2, Users, Wrench, DollarSign, FileText, Shield } from "lucide-react";
import logoImg from "@/assets/rentpal-logo.png";
import { PublicHelpWidget } from "@/components/PublicHelpWidget";

const CATEGORIES = [
  {
    icon: Building2, title: "Properties", articles: [
      { q: "How do I add a property?", a: "Navigate to Properties from the sidebar, click 'Add Property', and fill in the details including name, address, units, and rent amount." },
      { q: "Can I edit property details later?", a: "Yes. Open the Property Command Center and update any field from the Overview tab." },
    ]
  },
  {
    icon: Users, title: "Tenants", articles: [
      { q: "How do I add a tenant?", a: "Go to the Tenants page and click 'Add Tenant'. Assign them to a property and unit." },
      { q: "Can tenants access the platform?", a: "Yes. Tenants log in with their own credentials and access a dedicated portal with lease, payment, and maintenance views." },
    ]
  },
  {
    icon: Wrench, title: "Maintenance", articles: [
      { q: "How do maintenance requests work?", a: "Tenants submit requests from their portal. Landlords review and create work orders. The Kanban board tracks progress from New to Closed." },
      { q: "Can I assign technicians?", a: "Yes. Work orders can be assigned to maintenance staff or vendors registered in the system." },
    ]
  },
  {
    icon: DollarSign, title: "Payments & Billing", articles: [
      { q: "How do I track rent payments?", a: "Payments are visible in the Financials page under Rent Received, and also within each Property and Tenant Command Center." },
      { q: "How do subscriptions work?", a: "Choose a plan from the Pricing page. Payments are processed via Stripe. You can manage or cancel from the Settings page." },
    ]
  },
  {
    icon: FileText, title: "Documents", articles: [
      { q: "What documents can I store?", a: "Leases, compliance certificates, tenant ID copies, receipts, and any other property-related files." },
      { q: "Are documents secure?", a: "Yes. Files are stored with encryption and access is restricted by role-based permissions." },
    ]
  },
  {
    icon: Shield, title: "Security", articles: [
      { q: "How is my data protected?", a: "We use encrypted storage, secure authentication, rate limiting, and role-based access controls." },
      { q: "Can I control who sees what?", a: "Yes. Roles (Admin, Landlord, Tenant, Maintenance) determine what each user can view and modify." },
    ]
  },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="RentPal" className="h-8 w-8" />
            <span className="font-extrabold text-xl">RentPal</span>
          </Link>
          <Link to="/"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold mb-4">Help Center</h1>
        <p className="text-lg text-muted-foreground mb-12">Find answers to common questions about using RentPal.</p>

        <div className="space-y-8">
          {CATEGORIES.map(cat => (
            <Card key={cat.title} className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <cat.icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold">{cat.title}</h2>
                </div>
                <Accordion type="single" collapsible>
                  {cat.articles.map((a, i) => (
                    <AccordionItem key={i} value={`${cat.title}-${i}`}>
                      <AccordionTrigger className="text-left text-sm">{a.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{a.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">Can't find what you're looking for?</p>
          <Link to="/contact"><Button className="gap-2">Contact Support</Button></Link>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} RentPal. All rights reserved.
      </footer>
    </div>
  );
}
