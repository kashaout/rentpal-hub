import { formatCurrency } from "@/lib/formatCurrency";

export function exportToCSV(data: Record<string, any>[], filename: string, headers?: Record<string, string>) {
  if (!data.length) return;

  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerRow = headers ? Object.values(headers) : keys;

  const csvRows = [
    headerRow.join(","),
    ...data.map((row) =>
      keys.map((k) => {
        const val = row[k];
        const str = val === null || val === undefined ? "" : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToPDF(title: string, data: Record<string, any>[], headers?: Record<string, string>) {
  if (!data.length) return;

  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerRow = headers ? Object.values(headers) : keys;

  // Build a simple printable HTML table
  const rows = data.map((row) =>
    `<tr>${keys.map((k) => `<td style="padding:6px 10px;border:1px solid #ddd;font-size:12px">${row[k] ?? ""}</td>`).join("")}</tr>`
  ).join("");

  const html = `
    <html><head><title>${title}</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:24px}
      h1{font-size:18px;margin-bottom:12px}
      table{border-collapse:collapse;width:100%}
      th{background:#f5f5f5;padding:8px 10px;border:1px solid #ddd;font-size:12px;text-align:left}
    </style>
    </head><body>
    <h1>${title}</h1>
    <p style="font-size:12px;color:#666">Exported on ${new Date().toLocaleDateString()}</p>
    <table><thead><tr>${headerRow.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
    </body></html>
  `;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }
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
