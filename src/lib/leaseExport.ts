/**
 * Lightweight client-side helpers for downloading the lease as a printable PDF
 * and emailing the same content via the `send-document-email` edge function.
 *
 * We avoid heavy PDF libs by leveraging the browser's print → "Save as PDF" flow,
 * and we also expose an HTML-to-email helper for the email button.
 */
import { supabase } from "@/integrations/supabase/client";

export function printLeaseHtml(html: string, title = "Lease Agreement") {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    alert("Please allow pop-ups to download the lease as PDF.");
    return;
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
    <title>${title}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
             padding: 32px; color: #111; line-height: 1.55; }
      h1 { font-size: 22px; text-align: center; margin: 0 0 6px; letter-spacing: .04em; }
      h2 { font-size: 14px; margin: 18px 0 6px; }
      p { margin: 0 0 10px; font-size: 13px; }
      hr { border: 0; border-top: 1px solid #ddd; margin: 16px 0; }
      .small { font-size: 11px; color: #555; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }
      .sig { border-bottom: 1px solid #555; padding-bottom: 4px; margin-top: 14px; }
      .box { border: 1px solid #e2e2e2; border-radius: 8px; padding: 12px 14px; }
    </style>
  </head><body>${html}<script>window.onload=()=>{window.focus();window.print();}</script></body></html>`);
  w.document.close();
}

export async function emailLeaseHtml(opts: {
  to?: string;
  subject?: string;
  html: string;
  textFallback?: string;
}) {
  const { data, error } = await supabase.functions.invoke("send-document-email", {
    body: {
      to: opts.to,
      subject: opts.subject ?? "Your RentPal lease agreement",
      htmlBody: opts.html,
      textBody: opts.textFallback,
    },
  });
  if (error) throw error;
  return data as { ok: boolean; recipient: string };
}

/**
 * Build a clean, printable HTML representation of a lease agreement for both
 * the PDF download and the email body.
 */
export function buildLeaseHtml(args: {
  landlordName: string;
  tenantName: string;
  unitNumber: string;
  leaseStart: string;
  leaseEnd: string;
  rentAmount: number;
  currency: string;
  terms?: string | null;
  landlordSignedAt?: string | null;
  tenantSignedAt?: string | null;
}) {
  const fmt = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }) : "—";
  const currency = args.currency || "NGN";
  const symbol = currency === "NGN" ? "₦" : "";
  const fmtMoney = (n: number) => `${symbol}${Number(n || 0).toLocaleString()}`;

  return `
    <h1>TENANCY AGREEMENT</h1>
    <p class="small" style="text-align:center">Made pursuant to the Lagos State Tenancy Law 2011 (as amended)</p>
    <hr />
    <div class="box">
      <p><strong>Landlord:</strong> ${args.landlordName}</p>
      <p><strong>Tenant:</strong> ${args.tenantName}</p>
      <p><strong>Premises:</strong> Unit ${args.unitNumber}</p>
      <p><strong>Term:</strong> ${fmt(args.leaseStart)} → ${fmt(args.leaseEnd)}</p>
      <p><strong>Monthly Rent:</strong> ${fmtMoney(args.rentAmount)} (${currency})</p>
    </div>
    <h2>1. Term of Tenancy</h2>
    <p>The Landlord lets and the Tenant takes the Premises commencing on ${fmt(args.leaseStart)} and expiring at midnight on ${fmt(args.leaseEnd)}.</p>
    <h2>2. Rent</h2>
    <p>Rent of ${fmtMoney(args.rentAmount)} is payable on or before the 1st day of each calendar month.</p>
    <h2>3. Security Deposit</h2>
    <p>The Tenant shall deposit ${fmtMoney(args.rentAmount * 2)} as caution/security deposit, refundable less deductions.</p>
    <h2>4. Use of Premises</h2>
    <p>The Premises shall be used exclusively as a private residential dwelling.</p>
    <h2>5. Repairs and Maintenance</h2>
    <p>The Landlord is responsible for structural repairs. The Tenant shall maintain the Premises in good condition.</p>
    <h2>6. Default and Termination</h2>
    <p>Pursuant to Section 13 of the Lagos State Tenancy Law 2011, a written Notice to Quit applies in the event of breach.</p>
    ${args.terms && args.terms !== "Standard lease agreement terms apply." ? `<h2>Additional Terms</h2><p>${args.terms.replace(/\n/g, "<br/>")}</p>` : ""}
    <hr />
    <div class="grid">
      <div>
        <p class="small"><strong>LANDLORD</strong></p>
        <p>${args.landlordName}</p>
        <div class="sig">${args.landlordSignedAt ? `Signed digitally on ${fmt(args.landlordSignedAt)}` : "Signature: ________________"}</div>
      </div>
      <div>
        <p class="small"><strong>TENANT</strong></p>
        <p>${args.tenantName}</p>
        <div class="sig">${args.tenantSignedAt ? `Signed digitally on ${fmt(args.tenantSignedAt)}` : "Signature: ________________"}</div>
      </div>
    </div>
  `;
}
