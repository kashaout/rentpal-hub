import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, Heart, Globe, Users } from "lucide-react";
import logoImg from "@/assets/rentpal-logo.png";
import { PublicHelpWidget } from "@/components/PublicHelpWidget";

export default function About() {
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

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold mb-6">About RentPal</h1>
        <p className="text-lg text-muted-foreground mb-12">
          RentPal was built with a single mission: to make property management simple, transparent, and efficient for every landlord and property manager in Africa and beyond.
        </p>

        <div className="space-y-12">
          {[
            { icon: Target, title: "Our Mission", text: "To empower property owners with modern tools that eliminate paperwork, automate operations, and improve tenant relationships — so they can focus on growing their portfolio." },
            { icon: Heart, title: "Our Values", text: "We believe in transparency, security, and simplicity. Every feature we build is designed to save you time, protect your data, and make your life easier." },
            { icon: Globe, title: "Built for Africa", text: "RentPal is designed for the realities of the African property market — from Naira-based pricing to compliance frameworks that match local regulations." },
            { icon: Users, title: "Our Team", text: "We're a team of property tech enthusiasts, software engineers, and real estate professionals who understand the challenges landlords face every day." },
          ].map(s => (
            <div key={s.title} className="flex gap-5">
              <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">{s.title}</h2>
                <p className="text-muted-foreground">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} RentPal. All rights reserved.
      </footer>

      <PublicHelpWidget />
    </div>
  );
}
