import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-xl font-bold">Terms of Service</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8 prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground">Last updated: April 6, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using the RentPal platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>RentPal is a property operations platform that enables landlords, property managers, and tenants to manage rental properties, maintenance, documents, and finances. The Service is provided on a subscription basis with various tiers.</p>

        <h2>3. User Accounts</h2>
        <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials and for all activities that occur under your account.</p>

        <h2>4. Subscriptions & Payments</h2>
        <p>Paid plans are billed on a recurring basis. You may cancel at any time, but no refunds are issued for partial billing periods. We reserve the right to modify pricing with 30 days' notice.</p>

        <h2>5. Acceptable Use</h2>
        <p>You agree not to use the Service for any unlawful purpose, to upload malicious content, or to attempt to gain unauthorized access to other accounts or systems.</p>

        <h2>6. Data Ownership</h2>
        <p>You retain ownership of all data you upload to the platform. We do not sell your data. We use your data only to provide and improve the Service as described in our Privacy Policy.</p>

        <h2>7. Limitation of Liability</h2>
        <p>RentPal is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>

        <h2>8. Termination</h2>
        <p>We reserve the right to suspend or terminate accounts that violate these terms. Upon termination, your data will be retained for 30 days before deletion unless required by law.</p>

        <h2>9. Changes to Terms</h2>
        <p>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>

        <h2>10. Contact</h2>
        <p>For questions about these terms, contact us at <a href="mailto:legal@rentpal.app">legal@rentpal.app</a>.</p>
      </main>
    </div>
  );
}
