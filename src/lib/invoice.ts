/**
 * Invoice generator — creates professional printable HTML invoices
 * from booking & folio data. Opens in a new window for print → PDF.
 */

import { format } from 'date-fns';
import type { FolioEntry, Booking, Room } from '@/types';

// ── HTML escape ──────────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Types ────────────────────────────────────────────────────────

export interface InvoiceData {
  hotelName: string;
  hotelAddress?: string;
  hotelPhone?: string;
  hotelEmail?: string;
  invoiceNumber: string;
  booking: Booking;
  room?: Room;
  entries: FolioEntry[];
  taxRules?: { name: string; rate: number }[];
  notes?: string;
}

// ── Invoice number generator ─────────────────────────────────────

let invoiceCounter = 1;

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const num = String(invoiceCounter++).padStart(4, '0');
  return `INV-${year}-${num}`;
}

// ── Generate invoice HTML ────────────────────────────────────────

export function generateInvoiceHTML(data: InvoiceData): string {
  const {
    hotelName,
    hotelAddress,
    hotelPhone,
    hotelEmail,
    invoiceNumber,
    booking,
    room,
    entries,
    taxRules = [],
    notes,
  } = data;

  const guestName = booking.guest
    ? `${booking.guest.first_name} ${booking.guest.last_name}`
    : 'Guest';
  const guestEmail = booking.guest?.email ?? '';
  const guestPhone = booking.guest?.phone ?? '';

  const roomLabel = room ? `Room ${room.room_number}` : 'N/A';
  const roomType = booking.room_type?.name ?? 'Room';
  const checkIn = format(new Date(booking.check_in), 'dd MMM yyyy');
  const checkOut = format(new Date(booking.check_out), 'dd MMM yyyy');
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) /
        86_400_000,
    ),
  );

  // Separate charges, payments, refunds
  const charges = entries.filter((e) => e.type === 'charge' && !e.is_voided);
  const payments = entries.filter((e) => e.type === 'payment' && !e.is_voided);
  const refunds = entries.filter((e) => e.type === 'refund' && !e.is_voided);

  const subtotal = charges.reduce((s, e) => s + e.amount, 0);
  const totalPayments = payments.reduce((s, e) => s + e.amount, 0);
  const totalRefunds = refunds.reduce((s, e) => s + e.amount, 0);

  // Calculate taxes
  const taxLines = taxRules.map((rule) => ({
    name: rule.name,
    rate: rule.rate,
    amount: subtotal * (rule.rate / 100),
  }));
  const totalTax = taxLines.reduce((s, t) => s + t.amount, 0);

  const grandTotal = subtotal + totalTax;
  const balance = grandTotal - totalPayments + totalRefunds;

  const issueDate = format(new Date(), 'dd MMM yyyy');
  const issueTime = format(new Date(), 'HH:mm');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${esc(invoiceNumber)} — ${esc(guestName)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a2e; line-height: 1.55; background: #fff; padding: 40px;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .hotel-info h1 { font-size: 24px; font-weight: 700; letter-spacing: 2px; color: #0a0e1a; text-transform: uppercase; }
    .hotel-info p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .invoice-box { text-align: right; }
    .invoice-box h2 { font-size: 28px; font-weight: 300; color: #c9a84c; letter-spacing: 3px; }
    .invoice-box .inv-num { font-size: 13px; font-weight: 600; color: #0a0e1a; margin-top: 4px; }
    .invoice-box .inv-date { font-size: 11px; color: #64748b; }
    .divider { height: 3px; background: linear-gradient(to right, #c9a84c, #0d9488); margin: 24px 0; border-radius: 2px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .section-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; }
    .detail-block p { font-size: 12px; color: #334155; line-height: 1.7; }
    .detail-block strong { color: #0a0e1a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: #fff; background: #0a0e1a; padding: 10px 12px; text-align: left; }
    thead th:last-child { text-align: right; }
    tbody td { padding: 9px 12px; font-size: 11px; border-bottom: 1px solid #e2e8f0; }
    tbody td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .totals-table { width: 320px; margin-left: auto; border-collapse: collapse; }
    .totals-table td { padding: 6px 12px; font-size: 12px; }
    .totals-table .label { color: #64748b; text-align: left; }
    .totals-table .value { text-align: right; font-weight: 500; font-variant-numeric: tabular-nums; }
    .totals-table .total-row td { font-size: 14px; font-weight: 700; color: #0a0e1a; border-top: 2px solid #c9a84c; padding-top: 10px; }
    .totals-table .balance-row td { font-size: 16px; font-weight: 800; color: ${balance > 0.01 ? '#e11d48' : '#059669'}; }
    .payments-section { margin-top: 24px; }
    .payments-section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: #0a0e1a; margin-bottom: 8px; }
    .payment-line { display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; color: #334155; }
    .payment-line .method { color: #64748b; }
    .notes { margin-top: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px; color: #64748b; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .footer p { font-size: 10px; color: #94a3b8; }
    .footer .brand { font-size: 11px; font-weight: 700; color: #c9a84c; letter-spacing: 2px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="hotel-info">
      <h1>${esc(hotelName)}</h1>
      ${hotelAddress ? `<p>${esc(hotelAddress)}</p>` : ''}
      ${hotelPhone ? `<p>Tel: ${esc(hotelPhone)}</p>` : ''}
      ${hotelEmail ? `<p>${esc(hotelEmail)}</p>` : ''}
    </div>
    <div class="invoice-box">
      <h2>INVOICE</h2>
      <p class="inv-num">${esc(invoiceNumber)}</p>
      <p class="inv-date">Issued: ${issueDate} at ${issueTime}</p>
    </div>
  </div>

  <div class="divider"></div>

  <div class="two-col">
    <div class="detail-block">
      <p class="section-label">Bill To</p>
      <p><strong>${esc(guestName)}</strong></p>
      ${guestEmail ? `<p>${esc(guestEmail)}</p>` : ''}
      ${guestPhone ? `<p>${esc(guestPhone)}</p>` : ''}
    </div>
    <div class="detail-block">
      <p class="section-label">Stay Details</p>
      <p><strong>${esc(roomType)}</strong> — ${esc(roomLabel)}</p>
      <p>${checkIn} → ${checkOut} (${nights} night${nights !== 1 ? 's' : ''})</p>
      <p>Confirmation: <strong>${esc(booking.confirmation_code)}</strong></p>
    </div>
  </div>

  <!-- Charges Table -->
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Category</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${charges
        .sort((a, b) => new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime())
        .map(
          (e) => `
        <tr>
          <td>${format(new Date(e.posted_at), 'dd/MM/yyyy')}</td>
          <td>${esc(e.description)}</td>
          <td style="text-transform:capitalize">${esc(e.category)}</td>
          <td>${e.quantity}</td>
          <td>£${e.unit_price.toFixed(2)}</td>
          <td>£${e.amount.toFixed(2)}</td>
        </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <!-- Totals -->
  <table class="totals-table">
    <tr><td class="label">Subtotal</td><td class="value">£${subtotal.toFixed(2)}</td></tr>
    ${taxLines
      .map(
        (t) =>
          `<tr><td class="label">${esc(t.name)} (${t.rate}%)</td><td class="value">£${t.amount.toFixed(2)}</td></tr>`,
      )
      .join('')}
    <tr class="total-row"><td class="label">Total</td><td class="value">£${grandTotal.toFixed(2)}</td></tr>
    <tr><td class="label">Payments Received</td><td class="value">-£${totalPayments.toFixed(2)}</td></tr>
    ${totalRefunds > 0 ? `<tr><td class="label">Refunds</td><td class="value">+£${totalRefunds.toFixed(2)}</td></tr>` : ''}
    <tr class="balance-row"><td class="label">${balance > 0.01 ? 'Balance Due' : 'Paid in Full'}</td><td class="value">${balance > 0.01 ? `£${balance.toFixed(2)}` : '£0.00'}</td></tr>
  </table>

  <!-- Payments Detail -->
  ${payments.length > 0
    ? `
    <div class="payments-section">
      <h3>Payment History</h3>
      ${payments
        .map(
          (p) => `
        <div class="payment-line">
          <span>${format(new Date(p.posted_at), 'dd/MM/yyyy')} — ${esc(p.description)} <span class="method">(${esc(p.category)})</span></span>
          <span>£${p.amount.toFixed(2)}</span>
        </div>`,
        )
        .join('')}
    </div>`
    : ''}

  ${notes ? `<div class="notes"><strong>Notes:</strong> ${esc(notes)}</div>` : ''}

  <div class="footer">
    <p>Thank you for staying with us. We look forward to welcoming you again.</p>
    <div class="brand">ARRIVÉ</div>
  </div>

  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body>
</html>`;
}

// ── Open invoice in new window ───────────────────────────────────

export function printInvoice(data: InvoiceData): void {
  const html = generateInvoiceHTML(data);
  const w = window.open('', '_blank', 'width=900,height=1100');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
