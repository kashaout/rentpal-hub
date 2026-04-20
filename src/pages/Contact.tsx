import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MapPin, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@/assets/rentpal-logo.png";
import { PublicHelpWidget } from "@/components/PublicHelpWidget";

export default function Contact() {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

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

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold mb-4">Contact Us</h1>
        <p className="text-lg text-muted-foreground mb-12">Have a question or need help? We'd love to hear from you.</p>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-6">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Your name" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="How can we help?" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Tell us more..." rows={5} required />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={sending}>
                  {sending ? "Sending..." : <><Send className="h-4 w-4" /> Send Message</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {[
              { icon: Mail, title: "Email", value: "support@rentpal.io", href: "mailto:support@rentpal.io" },
              { icon: Phone, title: "Phone", value: "+234 800 RENTPAL", href: "tel:+234800736872" },
              { icon: MapPin, title: "Address", value: "Lagos, Nigeria", href: "#" },
            ].map(c => (
              <Card key={c.title} className="shadow-card">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <c.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold">{c.title}</p>
                    <a href={c.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{c.value}</a>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="shadow-card bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-bold mb-2">Business Hours</h3>
                <p className="text-sm text-muted-foreground">Monday – Friday: 8:00 AM – 6:00 PM (WAT)</p>
                <p className="text-sm text-muted-foreground">Saturday: 9:00 AM – 2:00 PM</p>
                <p className="text-sm text-muted-foreground">Sunday: Closed</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} RentPal. All rights reserved.
      </footer>

      <PublicHelpWidget />
    </div>
  );
}
