import { formatCurrency } from "@/lib/formatCurrency";
import { format } from "date-fns";

interface ReportMeta {
  title: string;
  dateFrom: Date;
  dateTo: Date;
  generatedAt?: Date;
}

// ─── Professional PDF Export ─────────────────────────────────────────────────

export function exportAccountantPDF(
  meta: ReportMeta,
  headers: string[],
  rows: string[][],
  totals?: { label: string; value: string }[]
) {
  const generated = meta.generatedAt || new Date();
  const dateRange = `${format(meta.dateFrom, "MMMM d, yyyy")} — ${format(meta.dateTo, "MMMM d, yyyy")}`;

  const totalRows = totals
    ? totals
        .map(
          (t) =>
            `<tr style="background:#f0f4f8;font-weight:700"><td colspan="${headers.length - 1}" style="padding:8px 12px;border:1px solid #c8d6e5;text-align:right;font-size:12px">${t.label}</td><td style="padding:8px 12px;border:1px solid #c8d6e5;text-align:right;font-size:12px">${t.value}</td></tr>`
        )
        .join("")
    : "";

  const tableHeaders = headers
    .map(
      (h) =>
        `<th style="padding:8px 12px;border:1px solid #c8d6e5;font-size:11px;text-align:left;background:#2c3e50;color:#fff;font-weight:600;letter-spacing:0.3px">${h}</th>`
    )
    .join("");

  const tableRows = rows
    .map(
      (row, i) =>
        `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">` +
        row
          .map(
            (cell) =>
              `<td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:11px;color:#334155">${cell}</td>`
          )
          .join("") +
        "</tr>"
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><title>${meta.title}</title>
<style>
  @page { size: A4 landscape; margin: 15mm; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #2c3e50; padding-bottom: 16px; }
  .logo { font-size: 24px; font-weight: 800; color: #2c3e50; letter-spacing: -0.5px; }
  .logo span { color: #e74c3c; }
  .meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.6; }
  .report-title { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  .date-range { font-size: 13px; color: #475569; margin-bottom: 20px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<div class="header">
  <div>
    <div class="logo">Rent<span>Pal</span></div>
    <div style="font-size:11px;color:#64748b;margin-top:2px">Property Management Platform</div>
  </div>
  <div class="meta">
    <div>Generated: ${format(generated, "MMMM d, yyyy 'at' h:mm a")}</div>
    <div>Report Period: ${dateRange}</div>
  </div>
</div>
<div class="report-title">${meta.title}</div>
<div class="date-range">Period: ${dateRange}</div>
<table>
  <thead><tr>${tableHeaders}</tr></thead>
  <tbody>${tableRows}${totalRows}</tbody>
</table>
<div class="footer">
  <div>RentPal — Confidential Financial Document</div>
  <div>Page 1</div>
</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }
}

// ─── Accountant-Grade CSV Export ─────────────────────────────────────────────

export function exportAccountantCSV(
  meta: ReportMeta,
  headers: string[],
  rows: string[][],
  totals?: { label: string; value: string }[]
) {
  const csvLines: string[] = [];

  // Header metadata
  csvLines.push(escCsv(meta.title));
  csvLines.push(
    escCsv(
      `Period: ${format(meta.dateFrom, "yyyy-MM-dd")} to ${format(meta.dateTo, "yyyy-MM-dd")}`
    )
  );
  csvLines.push(
    escCsv(`Generated: ${format(meta.generatedAt || new Date(), "yyyy-MM-dd HH:mm")}`)
  );
  csvLines.push(""); // blank line

  // Column headers
  csvLines.push(headers.map(escCsv).join(","));

  // Data rows
  rows.forEach((row) => csvLines.push(row.map(escCsv).join(",")));

  // Totals
  if (totals) {
    csvLines.push(""); // blank line
    totals.forEach((t) => {
      const totalRow = new Array(headers.length).fill("");
      totalRow[headers.length - 2] = t.label;
      totalRow[headers.length - 1] = t.value;
      csvLines.push(totalRow.map(escCsv).join(","));
    });
  }

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${meta.title.replace(/[^a-zA-Z0-9]/g, "_")}_${format(meta.dateFrom, "yyyyMMdd")}-${format(meta.dateTo, "yyyyMMdd")}.csv`);
}

function escCsv(val: string): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function fmtMoney(amount: number): string {
  return formatCurrency(amount);
}

export function fmtMoneyRaw(amount: number): string {
  return amount.toFixed(2);
}
