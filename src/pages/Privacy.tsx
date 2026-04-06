import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-xl font-bold">Privacy Policy</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8 prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground">Last updated: April 6, 2026</p>

        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly: name, email, phone number, property details, tenant information, and payment records. We also collect usage data including IP addresses, browser type, and interaction patterns.</p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide and maintain the Service</li>
          <li>To process transactions and send related communications</li>
          <li>To send notifications about your account and properties</li>
          <li>To improve and personalize the Service</li>
          <li>To comply with legal obligations</li>
        </ul>

        <h2>3. Data Storage & Security</h2>
        <p>Your data is stored on secure, encrypted servers. We implement industry-standard security measures including encryption at rest and in transit, access controls, and regular security audits. All sensitive data such as lease agreements, payment records, and tenant information is protected with row-level security policies.</p>

        <h2>4. Data Sharing</h2>
        <p>We do not sell your personal data. We may share data with:</p>
        <ul>
          <li>Payment processors (Stripe) to process transactions</li>
          <li>Email service providers to send notifications</li>
          <li>Law enforcement when required by law</li>
        </ul>

        <h2>5. Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal data. You may export your data at any time through the platform's export features. To request data deletion, contact our support team.</p>

        <h2>6. Cookies</h2>
        <p>We use essential cookies for authentication and session management. We do not use third-party advertising cookies.</p>

        <h2>7. Data Retention</h2>
        <p>We retain your data for as long as your account is active. After account deletion, data is retained for 30 days before permanent removal, unless longer retention is required by law.</p>

        <h2>8. Children's Privacy</h2>
        <p>The Service is not intended for users under 18. We do not knowingly collect data from minors.</p>

        <h2>9. Changes to This Policy</h2>
        <p>We may update this policy periodically. We will notify you of material changes via email or in-app notification.</p>

        <h2>10. Contact</h2>
        <p>For privacy inquiries, contact us at <a href="mailto:privacy@rentpal.app">privacy@rentpal.app</a>.</p>
      </main>
    </div>
  );
}
