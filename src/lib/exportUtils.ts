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

// ── Accounting CSV exports (Xero / QuickBooks) ───────────────────

export interface AccountingInvoiceRow {
  /** Invoice / confirmation reference */
  reference: string;
  /** YYYY-MM-DD */
  invoice_date: string;
  /** YYYY-MM-DD — optional */
  due_date?: string;
  contact_name: string;
  contact_email?: string;
  description: string;
  quantity: number;
  unit_amount: number;
  /** Tax rate name or decimal e.g. 0.20 */
  tax_rate?: number;
  account_code?: string;
  currency?: string;
}

/**
 * Export invoices in Xero's "Sales Invoices" CSV import format.
 * Column order matches Xero's template: https://central.xero.com/s/article/Import-sales-invoices
 * Each row is a single line on an invoice; rows sharing the same InvoiceNumber are grouped.
 */
export function exportXeroCSV(rows: AccountingInvoiceRow[], filename = 'arrive-xero-invoices'): void {
  if (rows.length === 0) return;
  const headers = [
    '*ContactName','EmailAddress','*InvoiceNumber','Reference','*InvoiceDate','*DueDate',
    'Description','*Quantity','*UnitAmount','*AccountCode','*TaxType','Currency',
  ];
  const taxTypeFor = (rate?: number): string => {
    if (rate == null || rate === 0) return 'Tax Exempt (0%)';
    if (Math.abs(rate - 0.20) < 0.001) return '20% (VAT on Income)';
    if (Math.abs(rate - 0.05) < 0.001) return '5% (VAT on Income)';
    return 'Tax on Sales';
  };
  const csvRows: string[] = [headers.join(',')];
  for (const r of rows) {
    const values = [
      r.contact_name,
      r.contact_email ?? '',
      r.reference,
      r.reference,
      r.invoice_date,
      r.due_date ?? r.invoice_date,
      r.description,
      String(r.quantity),
      r.unit_amount.toFixed(2),
      r.account_code ?? '200',
      taxTypeFor(r.tax_rate),
      r.currency ?? 'GBP',
    ].map(csvEscape);
    csvRows.push(values.join(','));
  }
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export invoices in QuickBooks Online's 3-column journal-style CSV import format.
 * Column order: InvoiceNo, Customer, InvoiceDate, DueDate, Terms, Location, Memo,
 * Item(Product/Service), ItemDescription, ItemQuantity, ItemRate, ItemAmount, ItemTaxCode, ItemTaxAmount
 */
export function exportQuickBooksCSV(rows: AccountingInvoiceRow[], filename = 'arrive-quickbooks-invoices'): void {
  if (rows.length === 0) return;
  const headers = [
    'InvoiceNo','Customer','InvoiceDate','DueDate','Terms','Memo',
    'Item','ItemDescription','ItemQuantity','ItemRate','ItemAmount','ItemTaxCode','Currency',
  ];
  const taxCodeFor = (rate?: number) => {
    if (rate == null || rate === 0) return 'NON';
    return 'TAX';
  };
  const csvRows: string[] = [headers.join(',')];
  for (const r of rows) {
    const amount = +(r.quantity * r.unit_amount).toFixed(2);
    const values = [
      r.reference,
      r.contact_name,
      r.invoice_date,
      r.due_date ?? r.invoice_date,
      'Due on receipt',
      r.description,
      'Accommodation',
      r.description,
      String(r.quantity),
      r.unit_amount.toFixed(2),
      amount.toFixed(2),
      taxCodeFor(r.tax_rate),
      r.currency ?? 'GBP',
    ].map(csvEscape);
    csvRows.push(values.join(','));
  }
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

function csvEscape(str: string): string {
  let s = str ?? '';
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
