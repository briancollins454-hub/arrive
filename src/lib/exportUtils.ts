/**
 * Export utilities — CSV download and printable PDF generation
 * Works entirely client-side, no server dependencies.
 */

// ── HTML escape helper ───────────────────────────────────────────
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── CSV Export ───────────────────────────────────────────────────

/**
 * Export an array of objects to a downloadable CSV file.
 * Keys of the first object become column headers.
 */
export function exportCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]!);
  const csvRows: string[] = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h];
      let str = val === null || val === undefined ? '' : String(val);
      // CSV injection protection: prefix dangerous leading chars
      if (/^[=+\-@]/.test(str)) str = "'" + str;
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

// ── Printable PDF (via browser print dialog) ─────────────────────

interface PDFOptions {
  title: string;
  subtitle?: string;
  propertyName?: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Export tabular data as a styled printable HTML page (triggers browser print → PDF).
 * Uses the Arrivé brand colours for a professional look.
 */
export function exportPrintablePDF(
  data: Record<string, unknown>[],
  options: PDFOptions,
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]!);
  const now = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const tableRows = data.map(row =>
    `<tr>${headers.map(h => `<td>${escHtml(String(row[h] ?? ''))}</td>`).join('')}</tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${options.title}</title>
  <style>
    @page { size: ${options.orientation ?? 'portrait'}; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px; color: #1a1a2e; line-height: 1.5;
      background: #fff;
    }
    .header {
      display: flex; justify-content: space-between; align-items: flex-end;
      border-bottom: 3px solid #c9a84c; padding-bottom: 12px; margin-bottom: 16px;
    }
    .header h1 { font-size: 22px; font-weight: 700; color: #0a0e1a; letter-spacing: 1px; }
    .header .subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
    .header .meta { text-align: right; font-size: 10px; color: #94a3b8; }
    .header .brand { font-size: 14px; font-weight: 700; color: #c9a84c; letter-spacing: 3px; }
    table {
      width: 100%; border-collapse: collapse; margin-top: 8px;
      page-break-inside: auto;
    }
    thead { background: #0a0e1a; }
    th {
      padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600;
      color: #fff; text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 2px solid #c9a84c;
    }
    td {
      padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;
    }
    tr:nth-child(even) { background: #f8fafc; }
    tr { page-break-inside: avoid; }
    .footer {
      margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;
    }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escHtml(options.title)}</h1>
      ${options.subtitle ? `<div class="subtitle">${escHtml(options.subtitle)}</div>` : ''}
    </div>
    <div class="meta">
      <div class="brand">ARRIVÉ</div>
      ${options.propertyName ? `<div>${escHtml(options.propertyName)}</div>` : ''}
      <div>Generated: ${now}</div>
    </div>
  </div>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">
    <span>${data.length} record${data.length !== 1 ? 's' : ''}</span>
    <span>Arrivé PMS — Confidential</span>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// ── Download helper ──────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
