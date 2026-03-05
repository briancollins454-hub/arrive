import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import { useFolios } from '@/hooks/useFolios';
import { useStripePayment } from '@/hooks/useStripePayment';
import { PageSpinner } from '@/components/shared/LoadingSpinner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';
import {
  ArrowLeft, Calendar, Mail, Phone, User, CreditCard,
  BedDouble, MapPin, Clock, PlusCircle, Pencil,
  CalendarPlus, Hash, Check, X, Printer, MessageSquare, FileText,
  Receipt, Ban, AlertCircle, Building, DollarSign, KeyRound,
  Lock, Loader2, ShieldCheck, Shield, CheckCircle,
} from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, isStripeConfigured, stripeDarkAppearance } from '@/lib/stripe';
import type { Stripe } from '@stripe/stripe-js';
import { useProperty } from '@/hooks/useProperty';
import { useKeyCard } from '@/hooks/useKeyCard';
import { KeyCardModal } from '@/components/dashboard/KeyCardModal';
import { cn } from '@/lib/utils';
import { getSourceLabel, SOURCE_LABELS } from '@/lib/constants';
import toast from 'react-hot-toast';
import type { BookingStatus, BookingSource, FolioChargeCategory, PaymentMethod } from '@/types';

// ============================================================
// Stripe Payment Form — rendered inside <Elements> provider
// ============================================================
function StripePaymentDialogInner({ amount, onSuccess, onError }: {
  amount: number;
  onSuccess: (paymentIntentId: string, last4?: string, brand?: string) => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (error) {
      onError(error.message ?? 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      const pm = paymentIntent.payment_method;
      const last4 = typeof pm === 'object' && pm && 'card' in pm ? (pm as unknown as Record<string, Record<string, string>>).card?.last4 : undefined;
      const brand = typeof pm === 'object' && pm && 'card' in pm ? (pm as unknown as Record<string, Record<string, string>>).card?.brand : undefined;
      onSuccess(paymentIntent.id, last4, brand);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs' }} />
      {ready && (
        <button
          onClick={handleSubmit}
          disabled={!stripe || processing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-body font-semibold text-charcoal bg-emerald-400 hover:bg-emerald-300 transition-all disabled:opacity-50"
        >
          {processing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
          ) : (
            <><Lock className="w-4 h-4" /> Pay £{amount.toFixed(2)}</>
          )}
        </button>
      )}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-steel/50">
        <ShieldCheck className="w-3 h-3" />
        <span>Powered by Stripe — secure payment</span>
      </div>
    </div>
  );
}

const STATUS_ACTIONS: Record<BookingStatus, { label: string; next: BookingStatus } | null> = {
  pending: { label: 'Confirm Booking', next: 'confirmed' },
  confirmed: { label: 'Check In Guest', next: 'checked_in' },
  checked_in: { label: 'Check Out Guest', next: 'checked_out' },
  checked_out: null,
  cancelled: null,
  no_show: null,
};

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { bookings, isLoading, updateStatus, modifyBooking, assignRoom } = useBookings();
  const { rooms, roomTypes } = useRooms();
  const { property } = useProperty();
  const folio = useFolios(id ?? '');
  const keyCard = useKeyCard();
  const qc = useQueryClient();

  const [showKeyCardModal, setShowKeyCardModal] = useState(false);
  const [encodedCards, setEncodedCards] = useState<import('@/hooks/useKeyCard').KeyCard[]>([]);
  const [isMasterKeyMode, setIsMasterKeyMode] = useState(false);

  const [showExtend, setShowExtend] = useState(false);
  const [extendNights, setExtendNights] = useState(1);
  const [showModifyDates, setShowModifyDates] = useState(false);
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [showAssignRoom, setShowAssignRoom] = useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null);
  const [editingRequests, setEditingRequests] = useState(false);
  const [requestsText, setRequestsText] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');

  // Room move state
  const [showRoomMove, setShowRoomMove] = useState(false);
  const [moveReason, setMoveReason] = useState('');

  // Folio dialog state
  const [showChargeDialog, setShowChargeDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showCheckoutBlockDialog, setShowCheckoutBlockDialog] = useState(false);
  const [chargeCategory, setChargeCategory] = useState<FolioChargeCategory>('food');
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeQty, setChargeQty] = useState(1);
  const [chargePrice, setChargePrice] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('card');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('card');
  const [refundReason, setRefundReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // City ledger transfer dialog state
  const [showCityLedgerDialog, setShowCityLedgerDialog] = useState(false);
  const [clSelectedCompany, setClSelectedCompany] = useState('');
  const [clSelectedEntryIds, setClSelectedEntryIds] = useState<Set<string>>(new Set());

  // Stripe payment state
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePaymentStep, setStripePaymentStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [stripeErrorMsg, setStripeErrorMsg] = useState('');
  const {
    createPaymentIntent,
    simulatePayment,
    recordPayment,
    reset: resetStripe,
  } = useStripePayment();

  // Load Stripe instance once
  useEffect(() => {
    if (isStripeConfigured) {
      getStripe().then(s => setStripeInstance(s));
    }
  }, []);

  const useRealStripe = isStripeConfigured && stripeInstance && paymentMethod === 'card';

  // Create PaymentIntent when card is selected, Stripe is configured, and amount is set
  useEffect(() => {
    if (!useRealStripe || !showPaymentDialog || !paymentAmount || Number(paymentAmount) <= 0) {
      setStripeClientSecret(null);
      return;
    }
    createPaymentIntent({
      bookingId: id ?? '',
      amount: Number(paymentAmount),
      description: `Payment for booking ${id}`,
    }).then(result => {
      if (result) setStripeClientSecret(result.clientSecret);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useRealStripe, showPaymentDialog, paymentAmount]);

  const handleStripePaymentSuccess = useCallback(async (paymentIntentId: string, last4?: string, brand?: string) => {
    const amt = Number(paymentAmount);
    await recordPayment({
      bookingId: id ?? '',
      amount: amt,
      paymentIntentId,
      cardLast4: last4,
      cardBrand: brand,
    });
    setStripePaymentStep('success');
  }, [paymentAmount, id, recordPayment]);

  const handleStripePaymentError = useCallback((message: string) => {
    setStripeErrorMsg(message);
    setStripePaymentStep('error');
  }, []);

  // Demo card processing — simulates a full card processing flow
  const processDemoCardPayment = useCallback(async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    setStripePaymentStep('processing');
    const success = await simulatePayment({
      bookingId: id ?? '',
      amount: Number(paymentAmount),
      method: 'card',
      cardLast4: '4242',
      cardBrand: 'Visa',
    });
    setStripePaymentStep(success ? 'success' : 'error');
    if (!success) setStripeErrorMsg('Card declined by issuer. Please try a different card.');
  }, [paymentAmount, id, simulatePayment]);

  const closePaymentDialog = useCallback(() => {
    setShowPaymentDialog(false);
    setPaymentAmount('');
    setPaymentDesc('');
    setStripeClientSecret(null);
    setStripePaymentStep('form');
    setStripeErrorMsg('');
    resetStripe();
  }, [resetStripe]);
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  const [cancelFeePercent, setCancelFeePercent] = useState(0);
  const [noShowFeePercent, setNoShowFeePercent] = useState(100);

  // Amendment panel state
  const [showAmendment, setShowAmendment] = useState(false);
  const [folioTab, setFolioTab] = useState<'guest' | 'company'>('guest');
  const [companyEntryIds, setCompanyEntryIds] = useState<Set<string>>(new Set());
  const [amendNumGuests, setAmendNumGuests] = useState(1);
  const [amendNightlyRate, setAmendNightlyRate] = useState('');
  const [amendSource, setAmendSource] = useState<string>('');
  const [amendGuestFirst, setAmendGuestFirst] = useState('');
  const [amendGuestLast, setAmendGuestLast] = useState('');
  const [amendGuestEmail, setAmendGuestEmail] = useState('');
  const [amendGuestPhone, setAmendGuestPhone] = useState('');

  // City ledger company accounts — read from shared query cache
  const cityLedgerCompanies = (() => {
    const cached = qc.getQueryData<{ id: string; company_name: string }[]>(['city-ledger-accounts']);
    if (cached) return cached.map(a => ({ id: a.id, name: a.company_name }));
    // Fallback if cache not yet populated
    return [
      { id: 'cl-1', name: 'Meridian Consulting Group' },
      { id: 'cl-2', name: 'Apex Travel Solutions' },
      { id: 'cl-3', name: 'Sterling & Associates Law' },
      { id: 'cl-4', name: 'Nova Tech Industries' },
    ];
  })();

  if (isLoading) return <PageSpinner />;

  const booking = bookings.find((b) => b.id === id);

  if (!booking) {
    return (
      <div className="p-6 text-center">
        <p className="text-steel font-body mb-4">Booking not found</p>
        <Button variant="outline-dark" onClick={() => navigate('/dashboard/bookings')}>
          <ArrowLeft size={16} className="mr-2" /> Back to Bookings
        </Button>
      </div>
    );
  }

  const guest = booking.guest;
  const roomType = booking.room_type;
  const nights = differenceInDays(new Date(booking.check_out), new Date(booking.check_in));
  const action = STATUS_ACTIONS[booking.status];
  const assignedRoom = rooms.find((r) => r.id === booking.room_id);
  const isModifiable = !['checked_out', 'cancelled', 'no_show'].includes(booking.status);

  /** HTML-escape user-controllable strings before injecting into document.write() */
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Fee base for cancellation / no-show — uses booking total, not folio entries
  // (folio may not have room charges posted yet for future bookings)
  const feeBase = booking.total_amount;

  const handleExtendStay = () => {
    const b = booking;
    if (!b) return;
    const newCheckOutDate = addDays(new Date(b.check_out), extendNights).toISOString().split('T')[0]!;
    const newTotalNights = differenceInDays(new Date(newCheckOutDate), new Date(b.check_in));
    modifyBooking.mutate({
      bookingId: b.id,
      updates: { check_out: newCheckOutDate, total_amount: b.nightly_rate * newTotalNights },
    });
    // Post folio room charges for each extended night
    for (let i = 0; i < extendNights; i++) {
      const nightDate = addDays(new Date(b.check_out), i);
      folio.postCharge.mutate({
        category: 'room',
        description: `Room charge — ${format(nightDate, 'dd MMM yyyy')}`,
        quantity: 1,
        unit_price: b.nightly_rate,
      });
    }
    setShowExtend(false);
    setExtendNights(1);
  };

  const handleModifyDates = () => {
    if (!newCheckIn || !newCheckOut) return;
    if (new Date(newCheckOut) <= new Date(newCheckIn)) {
      toast.error('Check-out must be after check-in');
      return;
    }
    const newNights = differenceInDays(new Date(newCheckOut), new Date(newCheckIn));
    modifyBooking.mutate({
      bookingId: booking.id,
      updates: { check_in: newCheckIn, check_out: newCheckOut, total_amount: booking.nightly_rate * newNights },
    });
    setShowModifyDates(false);
  };

  const effectiveRoomTypeId = selectedRoomTypeId ?? booking.room_type_id;
  const isUpgradeOrDowngrade = effectiveRoomTypeId !== booking.room_type_id;
  const selectedRoomType = roomTypes.find(rt => rt.id === effectiveRoomTypeId);

  const handleAssignRoom = (roomId: string) => {
    assignRoom.mutate({
      bookingId: booking.id,
      newRoomId: roomId,
      oldRoomId: booking.room_id,
      ...(isUpgradeOrDowngrade && selectedRoomType ? {
        newRoomTypeId: effectiveRoomTypeId,
        newNightlyRate: selectedRoomType.base_rate,
      } : {}),
    });
    setShowAssignRoom(false);
    setSelectedRoomTypeId(null);
    if (isUpgradeOrDowngrade && selectedRoomType) {
      toast.success(`Room type changed to ${selectedRoomType.name}`);
    }
  };

  const availableRoomsForType = rooms.filter(
    (r) => r.room_type_id === effectiveRoomTypeId && r.status === 'available' && r.housekeeping_status !== 'out_of_order'
  );

  const handleSaveRequests = () => {
    modifyBooking.mutate({ bookingId: booking.id, updates: { special_requests: requestsText || null } });
    setEditingRequests(false);
    toast.success('Special requests updated');
  };

  const handleSaveNotes = () => {
    modifyBooking.mutate({ bookingId: booking.id, updates: { internal_notes: notesText || null } });
    setEditingNotes(false);
    toast.success('Internal notes updated');
  };

  const handlePrintRegCard = () => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) { toast.error('Please allow popups to print'); return; }
    const propName = property?.name ?? 'Hotel';
    const propAddr = property?.address ? `${property.address.line1}, ${property.address.city}, ${property.address.postcode}` : '';
    const propPhone = property?.contact?.phone ?? '';
    w.document.write(`<!DOCTYPE html><html><head><title>Registration Card — ${esc(booking.confirmation_code)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; font-size: 14px; }
        h1 { font-size: 22px; text-align: center; margin-bottom: 4px; }
        .subtitle { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 24px; }
        .card { border: 2px solid #1a1a2e; border-radius: 8px; padding: 24px; margin-bottom: 20px; }
        .row { display: flex; gap: 20px; margin-bottom: 12px; }
        .field { flex: 1; }
        .field label { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .field .value { font-size: 14px; font-weight: 600; padding: 4px 0; border-bottom: 1px solid #e2e8f0; min-height: 24px; }
        .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .signature-area { margin-top: 30px; display: flex; gap: 40px; }
        .sig-line { flex: 1; border-bottom: 1px solid #1a1a2e; padding-top: 50px; text-align: center; font-size: 11px; color: #64748b; }
        .special { background: #f8fafc; border-radius: 6px; padding: 12px; margin-top: 12px; font-size: 13px; min-height: 40px; }
        .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>${esc(propName)}</h1>
      <p class="subtitle">${esc(propAddr)}${propPhone ? ' · ' + esc(propPhone) : ''}</p>
      <div class="card">
        <p class="section-title">Registration Card</p>
        <div class="row">
          <div class="field"><label>Confirmation</label><div class="value">${esc(booking.confirmation_code)}</div></div>
          <div class="field"><label>Status</label><div class="value">${esc(booking.status.replace('_', ' ').toUpperCase())}</div></div>
        </div>
        <div class="row">
          <div class="field"><label>Guest Name</label><div class="value">${esc(guest?.first_name ?? '')} ${esc(guest?.last_name ?? '')}</div></div>
          <div class="field"><label>Nationality</label><div class="value">${esc(guest?.nationality ?? '—')}</div></div>
        </div>
        <div class="row">
          <div class="field"><label>Email</label><div class="value">${esc(guest?.email ?? '—')}</div></div>
          <div class="field"><label>Phone</label><div class="value">${esc(guest?.phone ?? '—')}</div></div>
        </div>
      </div>
      <div class="card">
        <p class="section-title">Stay Details</p>
        <div class="row">
          <div class="field"><label>Check-in</label><div class="value">${format(new Date(booking.check_in), 'EEE, MMM d, yyyy')}</div></div>
          <div class="field"><label>Check-out</label><div class="value">${format(new Date(booking.check_out), 'EEE, MMM d, yyyy')}</div></div>
          <div class="field"><label>Nights</label><div class="value">${nights}</div></div>
        </div>
        <div class="row">
          <div class="field"><label>Room Type</label><div class="value">${esc(roomType?.name ?? '—')}</div></div>
          <div class="field"><label>Room Number</label><div class="value">${assignedRoom ? assignedRoom.room_number : 'TBA'}</div></div>
          <div class="field"><label>Guests</label><div class="value">${booking.num_guests}</div></div>
        </div>
        <div class="row">
          <div class="field"><label>Rate</label><div class="value">£${booking.nightly_rate.toFixed(2)} / night</div></div>
          <div class="field"><label>Total</label><div class="value">£${booking.total_amount.toFixed(2)}</div></div>
          <div class="field"><label>Paid</label><div class="value">£${folio.totalPayments.toFixed(2)}</div></div>
        </div>
        ${booking.special_requests ? `<p class="section-title" style="margin-top:16px">Special Requests</p><div class="special">${esc(booking.special_requests)}</div>` : ''}
      </div>
      <div class="signature-area">
        <div class="sig-line">Guest Signature</div>
        <div class="sig-line">Date</div>
        <div class="sig-line">Staff Initials</div>
      </div>
      <p class="footer">Printed ${format(new Date(), 'PPP p')} · ${esc(propName)}</p>
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  };

  const handlePrintInvoice = () => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) { toast.error('Please allow popups to print'); return; }
    const propName = property?.name ?? 'Hotel';
    const propAddr = property?.address ? `${property.address.line1}, ${property.address.city}, ${property.address.postcode}` : '';
    const propPhone = property?.contact?.phone ?? '';
    const activeEntries = folio.entries.filter(e => !e.is_voided);
    const charges = activeEntries.filter(e => e.type === 'charge' || e.type === 'adjustment');
    const payments = activeEntries.filter(e => e.type === 'payment' || e.type === 'refund');
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice — ${booking.confirmation_code}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; font-size: 13px; }
        h1 { font-size: 20px; margin-bottom: 2px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #1a1a2e; padding-bottom: 16px; }
        .subtitle { color: #64748b; font-size: 12px; }
        .meta { text-align: right; }
        .meta p { margin-bottom: 2px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }
        td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
        td.amount { text-align: right; font-weight: 600; }
        .total-row td { border-top: 2px solid #1a1a2e; font-weight: 700; font-size: 14px; }
        .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #94a3b8; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="header">
        <div>
          <h1>${esc(propName)}</h1>
          <p class="subtitle">${esc(propAddr)}</p>
          ${propPhone ? `<p class="subtitle">${esc(propPhone)}</p>` : ''}
        </div>
        <div class="meta">
          <p><strong>INVOICE</strong></p>
          <p>Ref: ${esc(booking.confirmation_code)}</p>
          <p>Date: ${format(new Date(), 'dd/MM/yyyy')}</p>
          <p>Guest: ${esc((guest?.first_name ?? '') + ' ' + (guest?.last_name ?? ''))}</p>
          <p>Source: ${esc(getSourceLabel(booking.source))}</p>
        </div>
      </div>
      <div class="section">
        <p class="section-title">Stay</p>
        <p>${format(new Date(booking.check_in), 'EEE, d MMM yyyy')} — ${format(new Date(booking.check_out), 'EEE, d MMM yyyy')} (${nights} night${nights !== 1 ? 's' : ''})</p>
        <p>${esc(roomType?.name ?? '')} ${assignedRoom ? '· Room ' + esc(assignedRoom.room_number) : ''}</p>
      </div>
      <div class="section">
        <p class="section-title">Charges</p>
        <table>
          <tr><th>Date</th><th>Description</th><th>Qty</th><th style="text-align:right">Amount</th></tr>
          ${charges.map(e => `<tr><td>${format(new Date(e.posted_at), 'dd/MM')}</td><td>${esc(e.description)}</td><td>${e.quantity}</td><td class="amount">£${e.amount.toFixed(2)}</td></tr>`).join('')}
          <tr class="total-row"><td colspan="3">Total Charges</td><td class="amount">£${folio.totalCharges.toFixed(2)}</td></tr>
        </table>
      </div>
      <div class="section">
        <p class="section-title">Payments</p>
        <table>
          <tr><th>Date</th><th>Description</th><th>Method</th><th style="text-align:right">Amount</th></tr>
          ${payments.map(e => `<tr><td>${format(new Date(e.posted_at), 'dd/MM')}</td><td>${esc(e.description)}</td><td>${esc(e.payment_method ?? '—')}</td><td class="amount">£${Math.abs(e.amount).toFixed(2)}</td></tr>`).join('')}
          <tr class="total-row"><td colspan="3">Total Payments</td><td class="amount">£${folio.totalPayments.toFixed(2)}</td></tr>
        </table>
      </div>
      <div class="section" style="text-align:right; font-size:16px; font-weight:700; padding-top:12px; border-top:2px solid #1a1a2e;">
        Balance Due: £${Math.max(0, folio.balance).toFixed(2)}
      </div>
      <p class="footer">Thank you for staying at ${esc(propName)} · Printed ${format(new Date(), 'PPP p')}</p>
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost-dark" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display text-white tracking-tight">
              {booking.confirmation_code}
            </h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-steel font-body mt-1">
            Booked {format(new Date(booking.created_at), 'PPP')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {action && (
            <Button
              onClick={() => {
                // Block checkout if outstanding folio balance
                if (action.next === 'checked_out' && folio.balance > 0.01) {
                  setShowCheckoutBlockDialog(true);
                  return;
                }
                // Check-in: trigger key card encoding first
                if (action.next === 'checked_in' && keyCard.config.auto_encode_on_checkin) {
                  if (!booking.room_id) {
                    toast.error('Please assign a room before checking in');
                    return;
                  }
                  setEncodedCards([]);
                  setIsMasterKeyMode(false);
                  keyCard.resetEncoding();
                  setShowKeyCardModal(true);
                  return;
                }
                updateStatus.mutate({ bookingId: booking.id, status: action.next });
              }}
              disabled={updateStatus.isPending}
            >
              {action.label}
            </Button>
          )}
          {booking.status !== 'cancelled' && booking.status !== 'checked_out' && booking.status !== 'no_show' && (
            <Button
              variant="danger"
              onClick={() => setShowCancelDialog(true)}
              disabled={updateStatus.isPending}
            >
              Cancel
            </Button>
          )}
          {booking.status === 'confirmed' && (
            <Button
              variant="outline-dark"
              onClick={() => setShowNoShowDialog(true)}
              disabled={updateStatus.isPending}
            >
              No-Show
            </Button>
          )}
        </div>
      </div>

      {/* Quick Actions Bar — only if booking can still be modified */}
      {isModifiable && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => {
              const toggling = !showAmendment;
              setShowAmendment(toggling); setShowExtend(false); setShowModifyDates(false); setShowAssignRoom(false); setShowRoomMove(false);
              if (toggling) {
                setAmendNumGuests(booking.num_guests);
                setAmendNightlyRate(String(booking.nightly_rate));
                setAmendSource(booking.source);
                setAmendGuestFirst(booking.guest?.first_name ?? '');
                setAmendGuestLast(booking.guest?.last_name ?? '');
                setAmendGuestEmail(booking.guest?.email ?? '');
                setAmendGuestPhone(booking.guest?.phone ?? '');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-all"
          >
            <Pencil size={13} />
            Amend Booking
          </button>
          <button
            onClick={() => { setShowExtend(!showExtend); setShowModifyDates(false); setShowAssignRoom(false); setShowRoomMove(false); setShowAmendment(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-teal/10 border border-teal/20 text-teal hover:bg-teal/20 transition-all"
          >
            <CalendarPlus size={13} />
            Extend Stay
          </button>
          <button
            onClick={() => {
              setShowModifyDates(!showModifyDates); setShowExtend(false); setShowAssignRoom(false); setShowRoomMove(false); setShowAmendment(false);
              setNewCheckIn(booking.check_in?.split('T')[0] ?? booking.check_in);
              setNewCheckOut(booking.check_out?.split('T')[0] ?? booking.check_out);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
          >
            <Pencil size={13} />
            Change Dates
          </button>
          <button
            onClick={() => { setShowAssignRoom(!showAssignRoom); setShowExtend(false); setShowModifyDates(false); setShowRoomMove(false); setShowAmendment(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all"
          >
            <Hash size={13} />
            {assignedRoom ? 'Change Room' : 'Assign Room'}
          </button>
          {booking.status === 'checked_in' && assignedRoom && (
            <button
              onClick={() => { setShowRoomMove(!showRoomMove); setShowExtend(false); setShowModifyDates(false); setShowAssignRoom(false); setShowAmendment(false); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all"
            >
              <ArrowLeft size={13} className="rotate-180" />
              Move Room
            </button>
          )}
        </div>
      )}

      {/* ── Amend Booking Panel ──────────────────────────────── */}
      {showAmendment && (
        <div className="glass-panel rounded-xl p-5 mb-6 animate-in slide-in-from-top-2 duration-200 border border-violet-500/20">
          <h3 className="text-sm font-display text-white mb-4 flex items-center gap-2">
            <Pencil size={14} className="text-violet-400" />
            Amend Booking
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {/* Guest Details Section */}
            <div className="sm:col-span-2">
              <p className="text-[11px] text-steel font-body uppercase tracking-wider mb-2 flex items-center gap-1">
                <User size={11} /> Guest Details
              </p>
            </div>
            <div>
              <label className="text-[11px] text-steel font-body block mb-1">First Name</label>
              <input
                type="text"
                value={amendGuestFirst}
                onChange={e => setAmendGuestFirst(e.target.value)}
                className="input-dark w-full text-sm"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="text-[11px] text-steel font-body block mb-1">Last Name</label>
              <input
                type="text"
                value={amendGuestLast}
                onChange={e => setAmendGuestLast(e.target.value)}
                className="input-dark w-full text-sm"
                placeholder="Last name"
              />
            </div>
            <div>
              <label className="text-[11px] text-steel font-body block mb-1">Email</label>
              <input
                type="email"
                value={amendGuestEmail}
                onChange={e => setAmendGuestEmail(e.target.value)}
                className="input-dark w-full text-sm"
                placeholder="guest@email.com"
              />
            </div>
            <div>
              <label className="text-[11px] text-steel font-body block mb-1">Phone</label>
              <input
                type="tel"
                value={amendGuestPhone}
                onChange={e => setAmendGuestPhone(e.target.value)}
                className="input-dark w-full text-sm"
                placeholder="+44 7..."
              />
            </div>

            {/* Booking Details Section */}
            <div className="sm:col-span-2 pt-2">
              <p className="text-[11px] text-steel font-body uppercase tracking-wider mb-2 flex items-center gap-1">
                <BedDouble size={11} /> Booking Details
              </p>
            </div>
            <div>
              <label className="text-[11px] text-steel font-body block mb-1">Number of Guests</label>
              <input
                type="number"
                min={1}
                max={10}
                value={amendNumGuests}
                onChange={e => setAmendNumGuests(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-dark w-full text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] text-steel font-body block mb-1">Nightly Rate (£)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amendNightlyRate}
                onChange={e => setAmendNightlyRate(e.target.value)}
                className="input-dark w-full text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-[11px] text-steel font-body block mb-1">Source / Channel</label>
              <select
                value={amendSource}
                onChange={e => setAmendSource(e.target.value)}
                className="input-dark w-full text-sm"
              >
                {Object.entries(SOURCE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              {amendNightlyRate && (
                <p className="text-xs text-steel font-body pb-2">
                  New total: <span className="text-gold font-semibold">£{(parseFloat(amendNightlyRate) * nights).toFixed(2)}</span>
                  <span className="text-steel/60 ml-1">({nights}N)</span>
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-white/[0.06]">
            <button
              onClick={() => setShowAmendment(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-body text-steel hover:text-white transition-all"
            >
              <X size={12} /> Cancel
            </button>
            <button
              onClick={() => {
                if (!amendGuestFirst.trim() || !amendGuestLast.trim()) {
                  toast.error('Guest name is required');
                  return;
                }
                const rate = parseFloat(amendNightlyRate);
                if (isNaN(rate) || rate <= 0) {
                  toast.error('Please enter a valid nightly rate');
                  return;
                }
                modifyBooking.mutate({
                  bookingId: booking.id,
                  updates: {
                    num_guests: amendNumGuests,
                    nightly_rate: rate,
                    total_amount: rate * nights,
                    source: amendSource as BookingSource,
                  },
                  guestUpdates: {
                    first_name: amendGuestFirst.trim(),
                    last_name: amendGuestLast.trim(),
                    email: amendGuestEmail.trim(),
                    phone: amendGuestPhone.trim(),
                  },
                });
                setShowAmendment(false);
              }}
              disabled={modifyBooking.isPending}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-body font-semibold bg-violet-500/15 border border-violet-500/25 text-violet-400 hover:bg-violet-500/25 transition-all disabled:opacity-50"
            >
              <Check size={12} /> Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Extend Stay Panel */}
      {showExtend && (
        <div className="glass-panel rounded-xl p-5 mb-6 animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-display text-white mb-3">Extend Stay</h3>
          <div className="flex items-center gap-3">
            <label className="text-xs text-steel font-body">Add nights:</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExtendNights((n) => Math.max(1, n - 1))}
                className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1] flex items-center justify-center text-sm"
              >−</button>
              <span className="text-white font-display text-lg w-8 text-center">{extendNights}</span>
              <button
                onClick={() => setExtendNights((n) => n + 1)}
                className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1] flex items-center justify-center text-sm"
              >+</button>
            </div>
            <div className="text-xs text-steel font-body ml-2">
              New checkout: <span className="text-silver">{format(addDays(new Date(booking.check_out), extendNights), 'EEE, MMM d')}</span>
              <span className="ml-2 text-gold">+£{(booking.nightly_rate * extendNights).toFixed(2)}</span>
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleExtendStay}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-body font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
              >
                <Check size={12} /> Confirm
              </button>
              <button
                onClick={() => setShowExtend(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-body text-steel hover:text-white transition-all"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Dates Panel */}
      {showModifyDates && (
        <div className="glass-panel rounded-xl p-5 mb-6 animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-display text-white mb-3">Change Dates</h3>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-[11px] text-steel font-body block mb-1">New Check-in</label>
              <input
                type="date"
                value={newCheckIn}
                onChange={(e) => setNewCheckIn(e.target.value)}
                className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white font-body outline-none focus:border-teal/40 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-steel font-body block mb-1">New Check-out</label>
              <input
                type="date"
                value={newCheckOut}
                onChange={(e) => setNewCheckOut(e.target.value)}
                className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white font-body outline-none focus:border-teal/40 transition-colors"
              />
            </div>
            {newCheckIn && newCheckOut && new Date(newCheckOut) > new Date(newCheckIn) && (
              <p className="text-xs text-steel font-body self-end pb-2">
                {differenceInDays(new Date(newCheckOut), new Date(newCheckIn))} nights
                <span className="ml-1 text-gold">
                  · £{(booking.nightly_rate * differenceInDays(new Date(newCheckOut), new Date(newCheckIn))).toFixed(2)} total
                </span>
              </p>
            )}
            <div className="flex gap-2 ml-auto self-end">
              <button
                onClick={handleModifyDates}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-body font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
              >
                <Check size={12} /> Update
              </button>
              <button
                onClick={() => setShowModifyDates(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-body text-steel hover:text-white transition-all"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Room Panel */}
      {showAssignRoom && (
        <div className="glass-panel rounded-xl p-5 mb-6 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-display text-white">
              {assignedRoom ? `Current: Room ${assignedRoom.room_number}` : 'Assign a Room'}
            </h3>
            {isUpgradeOrDowngrade && selectedRoomType && (
              <span className="text-[10px] font-body font-semibold px-2 py-1 rounded-full border bg-amber-400/10 border-amber-400/20 text-amber-400">
                {selectedRoomType.base_rate > booking.nightly_rate ? 'UPGRADE' : 'DOWNGRADE'} · £{selectedRoomType.base_rate}/night
              </span>
            )}
          </div>

          {/* Room Type Selector */}
          <div className="mb-3">
            <label className="text-[11px] text-steel font-body block mb-1.5">Room Type</label>
            <div className="flex flex-wrap gap-2">
              {roomTypes.filter(rt => rt.is_active).map(rt => {
                const availCount = rooms.filter(r => r.room_type_id === rt.id && r.status === 'available' && r.housekeeping_status !== 'out_of_order').length;
                const isCurrent = rt.id === booking.room_type_id;
                const isSelected = rt.id === effectiveRoomTypeId;
                return (
                  <button
                    key={rt.id}
                    onClick={() => setSelectedRoomTypeId(rt.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-medium border transition-all',
                      isSelected
                        ? 'bg-teal/10 border-teal/30 text-teal'
                        : 'bg-white/[0.04] border-white/[0.08] text-silver hover:bg-white/[0.06] hover:border-white/[0.12]',
                      availCount === 0 && 'opacity-50 cursor-not-allowed'
                    )}
                    disabled={availCount === 0}
                  >
                    <BedDouble size={12} />
                    {rt.name}
                    <span className={cn('text-[10px]', isSelected ? 'text-teal/70' : 'text-steel')}>
                      £{rt.base_rate} · {availCount} avail
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] bg-white/[0.08] px-1.5 py-0.5 rounded text-steel ml-0.5">current</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available Rooms for Selected Type */}
          {availableRoomsForType.length === 0 ? (
            <p className="text-xs text-steel font-body">No available rooms for this type.</p>
          ) : (
            <div>
              <label className="text-[11px] text-steel font-body block mb-1.5">Available Rooms</label>
              <div className="flex flex-wrap gap-2">
                {availableRoomsForType.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleAssignRoom(r.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-white/[0.05] border border-white/[0.1] text-white hover:bg-teal/10 hover:border-teal/20 hover:text-teal transition-all"
                  >
                    <BedDouble size={12} />
                    Room {r.room_number}
                    <span className="text-steel">· Floor {r.floor}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Room Move Panel — for checked-in guests */}
      {showRoomMove && booking.status === 'checked_in' && (
        <div className="glass-panel rounded-xl p-5 mb-6 animate-in slide-in-from-top-2 duration-200 border border-purple-500/20">
          <h3 className="text-sm font-display text-white mb-3">Move Guest to Different Room</h3>
          <p className="text-xs text-silver/70 mb-3">Current room: <span className="text-white">{assignedRoom?.room_number}</span>. Select a new room below. The move will be logged in the activity trail.</p>
          <div className="mb-3">
            <label className="text-[11px] text-steel font-body block mb-1.5">Reason for move</label>
            <select className="input-dark w-full text-sm" value={moveReason} onChange={e => setMoveReason(e.target.value)}>
              <option value="">Select reason...</option>
              <option value="guest_request">Guest Request</option>
              <option value="upgrade">Complimentary Upgrade</option>
              <option value="maintenance">Maintenance Issue</option>
              <option value="noise_complaint">Noise Complaint</option>
              <option value="housekeeping">Housekeeping Issue</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-steel font-body block mb-1.5">Available Rooms</label>
            <div className="flex flex-wrap gap-2">
              {rooms.filter(r => (r.status === 'available' || r.status === 'reserved') && r.housekeeping_status !== 'out_of_order' && r.id !== booking.room_id).map(r => {
                const rt = roomTypes.find(t => t.id === r.room_type_id);
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (!moveReason) { toast.error('Please select a reason for the move'); return; }
                      assignRoom.mutate({ bookingId: booking.id, newRoomId: r.id, oldRoomId: booking.room_id });
                      toast.success(`Guest moved to Room ${r.room_number}`);
                      setShowRoomMove(false);
                      setMoveReason('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-white/[0.05] border border-white/[0.1] text-white hover:bg-purple-500/10 hover:border-purple-500/20 hover:text-purple-400 transition-all"
                  >
                    <BedDouble size={12} />
                    Room {r.room_number}
                    <span className="text-steel">· {rt?.name ?? '?'} · £{rt?.base_rate ?? 0}/n</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={() => setShowRoomMove(false)} className="text-xs text-silver hover:text-white flex items-center gap-1"><X size={12} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stay Details */}
        <Card variant="dark" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Stay Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-teal" />
                <div>
                  <p className="text-xs text-steel font-body">Check-in</p>
                  <p className="text-white font-body">
                    {format(new Date(booking.check_in), 'EEE, MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-teal" />
                <div>
                  <p className="text-xs text-steel font-body">Check-out</p>
                  <p className="text-white font-body">
                    {format(new Date(booking.check_out), 'EEE, MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-teal" />
                <div>
                  <p className="text-xs text-steel font-body">Duration</p>
                  <p className="text-white font-body">{nights} night{nights !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BedDouble size={18} className="text-teal" />
                <div>
                  <p className="text-xs text-steel font-body">Room Type</p>
                  <p className="text-white font-body">{roomType?.name || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Assigned Room */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <Hash size={16} className="text-gold" />
              <div>
                <p className="text-xs text-steel font-body">Assigned Room</p>
                <p className="text-white font-body font-medium">
                  {assignedRoom ? `Room ${assignedRoom.room_number} · Floor ${assignedRoom.floor}` : 'Not yet assigned'}
                </p>
              </div>
              {isModifiable && !assignedRoom && (
                <button
                  onClick={() => { setShowAssignRoom(true); setShowExtend(false); setShowModifyDates(false); }}
                  className="ml-auto text-xs text-teal font-body font-semibold hover:underline"
                >
                  Assign now
                </button>
              )}
            </div>

            {/* Key Card Status */}
            {booking.status === 'checked_in' && (() => {
              const keys = keyCard.getKeysForBooking(booking.id);
              const activeKeys = keys.filter(k => k.status === 'active');
              return (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <KeyRound size={16} className="text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-xs text-steel font-body">Key Cards</p>
                    <p className="text-white font-body font-medium">
                      {activeKeys.length > 0
                        ? `${activeKeys.length} active key${activeKeys.length > 1 ? 's' : ''}`
                        : 'No active keys'}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        if (!assignedRoom) { toast.error('No room assigned'); return; }
                        setEncodedCards([]);
                        setIsMasterKeyMode(false);
                        keyCard.resetEncoding();
                        setShowKeyCardModal(true);
                      }}
                      className="text-[10px] text-teal font-body font-semibold hover:underline"
                    >
                      + Extra Key
                    </button>
                    {activeKeys.length > 0 && (
                      <>
                        <span className="text-white/20">|</span>
                        <button
                          onClick={() => {
                            if (!assignedRoom) { toast.error('No room assigned'); return; }
                            // Mark the most recent active key as lost and cut a new one
                            const lastActive = [...activeKeys].reverse().find(k => k.status === 'active');
                            if (lastActive) {
                              keyCard.markKeyLost(booking.id, lastActive.id);
                              toast.success('Previous key marked as lost');
                            }
                            setEncodedCards([]);
                            setIsMasterKeyMode(false);
                            keyCard.resetEncoding();
                            setShowKeyCardModal(true);
                          }}
                          className="text-[10px] text-amber-400 font-body font-semibold hover:underline"
                        >
                          Recut Key
                        </button>
                        <span className="text-white/20">|</span>
                        <button
                          onClick={() => {
                            if (confirm('Revoke all active keys for this booking?')) {
                              keyCard.revokeAllKeys(booking.id);
                              toast.success('All keys revoked');
                            }
                          }}
                          className="text-[10px] text-red-400 font-body font-semibold hover:underline"
                        >
                          Revoke All
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            <Separator variant="dark" />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User size={18} className="text-teal" />
                <div>
                  <p className="text-xs text-steel font-body">Guests</p>
                  <p className="text-white font-body">{booking.num_guests}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-teal" />
                <div>
                  <p className="text-xs text-steel font-body">Source</p>
                  <p className="text-white font-body">{getSourceLabel(booking.source)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign size={18} className="text-teal" />
                <div>
                  <p className="text-xs text-steel font-body">Nightly Rate</p>
                  <p className="text-white font-body">£{booking.nightly_rate.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard size={18} className="text-teal" />
                <div>
                  <p className="text-xs text-steel font-body">Total / Paid</p>
                  <p className="text-white font-body">£{booking.total_amount.toFixed(2)} / £{folio.totalPayments.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <Separator variant="dark" />

            {/* Special Requests — editable */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-steel font-body flex items-center gap-1"><MessageSquare size={11} /> Special Requests</p>
                {isModifiable && !editingRequests && (
                  <button
                    onClick={() => { setEditingRequests(true); setRequestsText(booking.special_requests ?? ''); }}
                    className="text-[11px] text-teal font-body hover:underline"
                  >
                    {booking.special_requests ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>
              {editingRequests ? (
                <div className="space-y-2">
                  <textarea
                    value={requestsText}
                    onChange={e => setRequestsText(e.target.value)}
                    rows={3}
                    className="input-dark w-full min-h-[60px] resize-y text-sm"
                    placeholder="Enter special requests…"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingRequests(false)} className="text-xs text-steel hover:text-white font-body">Cancel</button>
                    <button onClick={handleSaveRequests} className="text-xs text-teal font-body font-semibold hover:underline">Save</button>
                  </div>
                </div>
              ) : (
                <p className="text-white/80 text-sm font-body">{booking.special_requests || <span className="text-steel/50 italic">None</span>}</p>
              )}
            </div>

            {/* Internal Notes — editable */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-steel font-body flex items-center gap-1"><FileText size={11} /> Internal Notes</p>
                {!editingNotes && (
                  <button
                    onClick={() => { setEditingNotes(true); setNotesText(booking.internal_notes ?? ''); }}
                    className="text-[11px] text-teal font-body hover:underline"
                  >
                    {booking.internal_notes ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notesText}
                    onChange={e => setNotesText(e.target.value)}
                    rows={2}
                    className="input-dark w-full min-h-[40px] resize-y text-sm"
                    placeholder="Internal staff notes…"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingNotes(false)} className="text-xs text-steel hover:text-white font-body">Cancel</button>
                    <button onClick={handleSaveNotes} className="text-xs text-teal font-body font-semibold hover:underline">Save</button>
                  </div>
                </div>
              ) : (
                <p className="text-white/60 text-sm font-body italic">{booking.internal_notes || <span className="text-steel/50">No notes</span>}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Guest & Financial Sidebar */}
        <div className="space-y-6">
          {/* Guest Info */}
          <Card variant="dark">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white text-base">Guest</CardTitle>
              {isModifiable && (
                <button
                  onClick={() => {
                    setShowAmendment(true); setShowExtend(false); setShowModifyDates(false); setShowAssignRoom(false); setShowRoomMove(false);
                    setAmendNumGuests(booking.num_guests);
                    setAmendNightlyRate(String(booking.nightly_rate));
                    setAmendSource(booking.source);
                    setAmendGuestFirst(booking.guest?.first_name ?? '');
                    setAmendGuestLast(booking.guest?.last_name ?? '');
                    setAmendGuestEmail(booking.guest?.email ?? '');
                    setAmendGuestPhone(booking.guest?.phone ?? '');
                  }}
                  className="text-[11px] text-teal font-body hover:underline"
                >
                  Edit
                </button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {guest && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-charcoal flex items-center justify-center text-gold font-display text-sm">
                      {guest.first_name[0]}{guest.last_name[0]}
                    </div>
                    <div>
                      <p className="text-white font-body text-sm font-medium">
                        {guest.first_name} {guest.last_name}
                      </p>
                      {guest.nationality && (
                        <p className="text-steel text-xs font-body">{guest.nationality}</p>
                      )}
                    </div>
                  </div>
                  <Separator variant="dark" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={14} className="text-steel" />
                      <span className="text-white/80 font-body">{guest.email}</span>
                    </div>
                    {guest.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={14} className="text-steel" />
                        <span className="text-white/80 font-body">{guest.phone}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Folio / Billing */}
          <Card variant="dark">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Receipt size={16} className="text-gold" />
                Folio
              </CardTitle>

              {/* Split folio tabs */}
              <div className="flex items-center gap-1 mt-2 mb-1">
                <button
                  onClick={() => setFolioTab('guest')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-[11px] font-body font-semibold transition-all',
                    folioTab === 'guest'
                      ? 'bg-gold/15 text-gold border border-gold/25'
                      : 'text-steel hover:text-silver bg-white/[0.03] border border-white/[0.06]',
                  )}
                >
                  Guest Folio
                </button>
                <button
                  onClick={() => setFolioTab('company')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-[11px] font-body font-semibold transition-all',
                    folioTab === 'company'
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                      : 'text-steel hover:text-silver bg-white/[0.03] border border-white/[0.06]',
                  )}
                >
                  Company Folio ({companyEntryIds.size})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1 mt-1">
                <button
                  onClick={() => { setShowChargeDialog(true); setShowPaymentDialog(false); setShowDepositDialog(false); setShowRefundDialog(false); }}
                  className="px-2 py-0.5 rounded text-[9px] font-body font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all leading-tight"
                >
                  + Charge
                </button>
                <button
                  onClick={() => { setShowPaymentDialog(true); setShowChargeDialog(false); setShowDepositDialog(false); setShowRefundDialog(false); }}
                  className="px-2 py-0.5 rounded text-[9px] font-body font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all leading-tight"
                >
                  + Payment
                </button>
                <button
                  onClick={() => { setShowDepositDialog(true); setShowChargeDialog(false); setShowPaymentDialog(false); setShowRefundDialog(false); }}
                  className="px-2 py-0.5 rounded text-[9px] font-body font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all leading-tight"
                >
                  + Deposit
                </button>
                {folio.totalPayments > 0 && (
                  <button
                    onClick={() => { setShowRefundDialog(true); setShowChargeDialog(false); setShowPaymentDialog(false); setShowDepositDialog(false); }}
                    className="px-2 py-0.5 rounded text-[9px] font-body font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all leading-tight"
                  >
                    Refund
                  </button>
                )}
                {folio.entries.filter(e => !e.is_voided && e.type === 'charge').length > 0 && (
                  <button
                    onClick={() => {
                      setClSelectedCompany('');
                      setClSelectedEntryIds(new Set());
                      setShowCityLedgerDialog(true);
                    }}
                    className="px-2 py-0.5 rounded text-[9px] font-body font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-all leading-tight"
                  >
                    City Ledger
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Summary — shows totals for active folio tab */}
              {(() => {
                const tabEntries = folio.entries.filter((e) =>
                  folioTab === 'company' ? companyEntryIds.has(e.id) : !companyEntryIds.has(e.id),
                );
                const tabCharges = tabEntries.filter((e) => e.type === 'charge' && !e.is_voided).reduce((s, e) => s + e.amount, 0);
                const tabPayments = tabEntries.filter((e) => e.type === 'payment' && !e.is_voided).reduce((s, e) => s + e.amount, 0);
                const tabBalance = tabCharges - tabPayments;

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-steel text-xs font-body">Total Charges</span>
                      <span className="text-white font-body text-sm">£{tabCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-steel text-xs font-body">Payments</span>
                      <span className="text-emerald-400 font-body text-sm">£{tabPayments.toFixed(2)}</span>
                    </div>
                    <Separator variant="dark" />
                    <div className="flex justify-between items-center">
                      <span className="text-white font-body font-semibold text-sm">Balance</span>
                      <span className={cn(
                        'font-display text-lg',
                        tabBalance > 0 ? 'text-gold' : tabBalance < 0 ? 'text-emerald-400' : 'text-white'
                      )}>
                        £{Math.abs(tabBalance).toFixed(2)}
                        {tabBalance < 0 && <span className="text-[10px] ml-1 text-emerald-400">credit</span>}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <Separator variant="dark" />

              {/* Entries list — filtered by folio tab */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {folio.entries.filter((e) =>
                  folioTab === 'company' ? companyEntryIds.has(e.id) : !companyEntryIds.has(e.id),
                ).length === 0 && (
                  <p className="text-steel/50 text-xs font-body italic text-center py-3">
                    {folioTab === 'company' ? 'No items on company folio. Move charges from guest folio.' : 'No folio entries yet'}
                  </p>
                )}
                {folio.entries
                  .filter((e) =>
                    folioTab === 'company' ? companyEntryIds.has(e.id) : !companyEntryIds.has(e.id),
                  )
                  .map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center justify-between py-1.5 px-2 rounded-lg text-xs group',
                      entry.is_voided && 'opacity-40 line-through'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-silver font-body truncate">{entry.description}</p>
                      <p className="text-steel/60 text-[10px] font-body">
                        {format(new Date(entry.posted_at), 'dd MMM HH:mm')} · {entry.posted_by}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn(
                        'font-body font-medium',
                        entry.amount < 0 ? 'text-emerald-400' : 'text-white'
                      )}>
                        {entry.amount < 0 ? '-' : ''}£{Math.abs(entry.amount).toFixed(2)}
                      </span>
                      {/* Move to other folio */}
                      {!entry.is_voided && entry.type === 'charge' && (
                        <button
                          onClick={() => {
                            const next = new Set(companyEntryIds);
                            if (folioTab === 'guest') {
                              next.add(entry.id);
                              toast.success('Moved to company folio');
                            } else {
                              next.delete(entry.id);
                              toast.success('Moved to guest folio');
                            }
                            setCompanyEntryIds(next);
                          }}
                          title={folioTab === 'guest' ? 'Move to company folio' : 'Move to guest folio'}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-blue-500/10 text-steel/40 hover:text-blue-400 transition-all"
                        >
                          <Building size={10} />
                        </button>
                      )}
                      {!entry.is_voided && entry.posted_by !== 'System' && entry.posted_by !== 'Night Audit' && (
                        <button
                          onClick={() => folio.voidEntry.mutate(entry.id)}
                          title="Void entry"
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-steel/40 hover:text-red-400 transition-colors"
                        >
                          <Ban size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Print Invoice button */}
              {folio.entries.length > 0 && (
                <button
                  onClick={() => handlePrintInvoice()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-body font-semibold bg-white/[0.03] border border-white/[0.06] text-steel hover:text-silver hover:bg-white/[0.06] transition-all"
                >
                  <Printer size={12} />
                  <span>Print {folioTab === 'company' ? 'Company' : ''} Invoice</span>
                </button>
              )}

            </CardContent>
          </Card>

          {/* Quick Actions - always show print */}
          <Card variant="dark">
            <CardHeader>
              <CardTitle className="text-white text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Print Registration Card */}
              <button
                onClick={handlePrintRegCard}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-body font-semibold bg-gold/5 border border-gold/10 text-gold hover:bg-gold/10 transition-all text-left"
              >
                <Printer size={14} />
                <span>Print Registration Card</span>
              </button>
              {isModifiable && (
                <>
                  <button
                    onClick={() => {
                      const guestEmail = booking.guest?.email;
                      if (!guestEmail) { toast.error('No guest email on file'); return; }
                      const propName = property?.name ?? 'Hotel';
                      const w = window.open('', '_blank', 'width=700,height=700');
                      if (!w) { toast.error('Please allow popups'); return; }
                      w.document.write(`<!DOCTYPE html><html><head><title>Booking Confirmation</title>
                        <style>
                          * { margin: 0; padding: 0; box-sizing: border-box; }
                          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; font-size: 14px; max-width: 600px; margin: 0 auto; }
                          .logo { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
                          .subtitle { color: #64748b; font-size: 12px; margin-bottom: 24px; }
                          .card { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
                          .card h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 10px; }
                          .row { display: flex; justify-content: space-between; padding: 6px 0; }
                          .row .label { color: #64748b; }
                          .row .value { font-weight: 600; }
                          .highlight { background: #0d9488; color: #fff; border-radius: 12px; padding: 16px 20px; text-align: center; margin: 20px 0; }
                          .highlight .code { font-size: 28px; font-weight: 700; letter-spacing: 3px; }
                          .highlight .hint { font-size: 12px; opacity: 0.85; margin-top: 4px; }
                          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; }
                          @media print { body { padding: 20px; } }
                        </style></head><body>
                        <div class="logo">${esc(propName)}</div>
                        <p class="subtitle">Booking Confirmation</p>
                        <div class="highlight">
                          <div class="hint">Your Confirmation Code</div>
                          <div class="code">${esc(booking.confirmation_code)}</div>
                          <div class="hint">Please keep this for your records</div>
                        </div>
                        <div class="card">
                          <h3>Guest Details</h3>
                          <div class="row"><span class="label">Name</span><span class="value">${esc((guest?.first_name ?? '') + ' ' + (guest?.last_name ?? ''))}</span></div>
                          <div class="row"><span class="label">Email</span><span class="value">${esc(guestEmail)}</span></div>
                        </div>
                        <div class="card">
                          <h3>Stay Details</h3>
                          <div class="row"><span class="label">Check-in</span><span class="value">${format(new Date(booking.check_in), 'EEE, d MMM yyyy')}</span></div>
                          <div class="row"><span class="label">Check-out</span><span class="value">${format(new Date(booking.check_out), 'EEE, d MMM yyyy')}</span></div>
                          <div class="row"><span class="label">Nights</span><span class="value">${nights}</span></div>
                          <div class="row"><span class="label">Room Type</span><span class="value">${esc(roomType?.name ?? '—')}</span></div>
                          <div class="row"><span class="label">Guests</span><span class="value">${booking.num_guests}</span></div>
                          <div class="row"><span class="label">Total</span><span class="value">£${booking.total_amount?.toFixed(2) ?? '—'}</span></div>
                        </div>
                        <p class="footer">This confirms your reservation at ${esc(propName)}.<br/>If you have any questions, please contact us at ${esc(property?.contact?.email ?? '')} or ${esc(property?.contact?.phone ?? '')}.<br/><br/>We look forward to welcoming you!</p>
                      </body></html>`);
                      w.document.close();
                      toast.success(`Confirmation ready for ${guestEmail}`);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-body font-semibold bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 transition-all text-left"
                  >
                    <Mail size={14} />
                    <span>Send Guest Confirmation</span>
                  </button>
                  {companyEntryIds.size > 0 && (
                    <button
                      onClick={() => {
                        const propName = property?.name ?? 'Hotel';
                        // Find the company in folio transfer context
                        const companyCharges = folio.entries
                          .filter(e => !e.is_voided && e.type === 'charge' && companyEntryIds.has(e.id));
                        const companyTotal = companyCharges.reduce((s, e) => s + e.amount, 0);
                        const w = window.open('', '_blank', 'width=700,height=700');
                        if (!w) { toast.error('Please allow popups'); return; }
                        w.document.write(`<!DOCTYPE html><html><head><title>Company Billing Confirmation</title>
                          <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; font-size: 14px; max-width: 600px; margin: 0 auto; }
                            .logo { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
                            .subtitle { color: #64748b; font-size: 12px; margin-bottom: 24px; }
                            .card { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
                            .card h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 10px; }
                            .row { display: flex; justify-content: space-between; padding: 6px 0; }
                            .row .label { color: #64748b; }
                            .row .value { font-weight: 600; }
                            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                            th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }
                            td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
                            td.amount { text-align: right; font-weight: 600; }
                            .total { text-align: right; font-size: 16px; font-weight: 700; padding-top: 12px; border-top: 2px solid #1a1a2e; margin-top: 8px; }
                            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; }
                            @media print { body { padding: 20px; } }
                          </style></head><body>
                          <div class="logo">${esc(propName)}</div>
                          <p class="subtitle">Company Billing Confirmation</p>
                          <div class="card">
                            <h3>Booking Details</h3>
                            <div class="row"><span class="label">Confirmation</span><span class="value">${esc(booking.confirmation_code)}</span></div>
                            <div class="row"><span class="label">Guest</span><span class="value">${esc((guest?.first_name ?? '') + ' ' + (guest?.last_name ?? ''))}</span></div>
                            <div class="row"><span class="label">Check-in</span><span class="value">${format(new Date(booking.check_in), 'EEE, d MMM yyyy')}</span></div>
                            <div class="row"><span class="label">Check-out</span><span class="value">${format(new Date(booking.check_out), 'EEE, d MMM yyyy')}</span></div>
                          </div>
                          <div class="card">
                            <h3>Company Folio Items</h3>
                            <table>
                              <tr><th>Date</th><th>Description</th><th style="text-align:right">Amount</th></tr>
                              ${companyCharges.map(e => `<tr><td>${format(new Date(e.posted_at), 'dd/MM')}</td><td>${esc(e.description)}</td><td class="amount">£${e.amount.toFixed(2)}</td></tr>`).join('')}
                            </table>
                            <div class="total">Total: £${companyTotal.toFixed(2)}</div>
                          </div>
                          <p class="footer">This confirms the charges billed to your company account.<br/>Payment terms as per agreement.<br/><br/>${esc(propName)} · ${esc(property?.contact?.email ?? '')} · ${esc(property?.contact?.phone ?? '')}</p>
                        </body></html>`);
                        w.document.close();
                        toast.success('Company billing confirmation ready');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-body font-semibold bg-blue-500/5 border border-blue-500/10 text-blue-300 hover:bg-blue-500/10 transition-all text-left"
                    >
                      <Building size={14} />
                      <span>Send Company Confirmation</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setShowExtend(true); setShowModifyDates(false); setShowAssignRoom(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-body font-semibold bg-teal/5 border border-teal/10 text-teal hover:bg-teal/10 transition-all text-left"
                  >
                    <PlusCircle size={14} />
                    <span>Extend Stay</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowModifyDates(true); setShowExtend(false); setShowAssignRoom(false);
                      setNewCheckIn(booking.check_in?.split('T')[0] ?? booking.check_in);
                      setNewCheckOut(booking.check_out?.split('T')[0] ?? booking.check_out);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-body font-semibold bg-blue-500/5 border border-blue-500/10 text-blue-400 hover:bg-blue-500/10 transition-all text-left"
                  >
                    <Pencil size={14} />
                    <span>Modify Dates</span>
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charge Dialog — Modal (rendered at top level to escape card overflow) */}
      {showChargeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Post charge" onClick={() => setShowChargeDialog(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-display font-semibold text-white">Post Charge</h3>
            <div>
              <label className="block text-xs text-steel font-body mb-2">Category</label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { value: 'food', label: 'Food & Bev', icon: '🍽️' },
                  { value: 'beverage', label: 'Minibar', icon: '🍷' },
                  { value: 'spa', label: 'Spa', icon: '💆' },
                  { value: 'laundry', label: 'Laundry', icon: '👔' },
                  { value: 'parking', label: 'Parking', icon: '🅿️' },
                  { value: 'phone', label: 'Phone', icon: '📞' },
                  { value: 'damage', label: 'Damage', icon: '⚠️' },
                  { value: 'other', label: 'Other', icon: '📋' },
                ] as const).map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setChargeCategory(cat.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-body transition-all border',
                      chargeCategory === cat.value
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 font-semibold'
                        : 'bg-white/[0.03] border-white/[0.06] text-steel hover:bg-white/[0.06] hover:text-silver'
                    )}
                  >
                    <span className="text-sm">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-steel font-body mb-1.5">Description</label>
              <input
                type="text"
                placeholder="e.g. Club Sandwich & Chips"
                value={chargeDesc}
                onChange={(e) => setChargeDesc(e.target.value)}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body placeholder:text-white/20 placeholder:italic focus:outline-none focus:ring-1 focus:ring-gold/30"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <div className="w-24">
                <label className="block text-xs text-steel font-body mb-1.5">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={chargeQty}
                  onChange={(e) => setChargeQty(Number(e.target.value))}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body focus:outline-none focus:ring-1 focus:ring-gold/30"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-steel font-body mb-1.5">Unit Price (£)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={chargePrice}
                  onChange={(e) => setChargePrice(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body placeholder:text-white/20 placeholder:italic focus:outline-none focus:ring-1 focus:ring-gold/30"
                  placeholder="0.00"
                />
              </div>
              {chargePrice && chargeQty > 1 && (
                <div className="flex flex-col justify-end pb-2.5">
                  <span className="text-xs text-steel font-body">Total</span>
                  <span className="text-sm font-display text-gold font-semibold">£{(chargeQty * Number(chargePrice)).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowChargeDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!chargeDesc || !chargePrice) return;
                  folio.postCharge.mutate({
                    category: chargeCategory,
                    description: chargeDesc,
                    quantity: chargeQty,
                    unit_price: Number(chargePrice),
                  });
                  setShowChargeDialog(false);
                  setChargeDesc('');
                  setChargePrice('');
                  setChargeQty(1);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-charcoal bg-amber-400 hover:bg-amber-300 transition-all"
              >
                Post Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Dialog — Modal with Stripe / demo card processing */}
      {showPaymentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Process payment" onClick={closePaymentDialog}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>

            {/* Processing animation */}
            {stripePaymentStep === 'processing' ? (
              <div className="text-center space-y-5 py-6">
                <Loader2 className="w-10 h-10 text-teal animate-spin mx-auto" />
                <div>
                  <p className="text-white font-display font-semibold text-lg">Processing Payment</p>
                  <p className="text-steel text-sm font-body mt-1">£{Number(paymentAmount).toFixed(2)} via Card</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {['Validating', 'Authorising', 'Confirming'].map((label, i) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className={cn('w-2 h-2 rounded-full bg-teal animate-pulse', i > 0 && 'animation-delay-300')} style={{ animationDelay: `${i * 400}ms` }} />
                      <span className="text-[10px] text-steel font-body">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

            ) : stripePaymentStep === 'success' ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                <div>
                  <p className="text-white font-display font-semibold text-lg">Payment Successful</p>
                  <p className="text-steel text-sm font-body mt-1">£{Number(paymentAmount).toFixed(2)} received via Card</p>
                </div>
                <button
                  onClick={closePaymentDialog}
                  className="px-6 py-2.5 rounded-xl text-sm font-body font-semibold text-charcoal bg-emerald-400 hover:bg-emerald-300 transition-all"
                >
                  Done
                </button>
              </div>

            ) : stripePaymentStep === 'error' ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-white font-display font-semibold text-lg">Payment Failed</p>
                  <p className="text-steel text-sm font-body mt-1">{stripeErrorMsg || 'The payment was declined.'}</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <button onClick={closePaymentDialog} className="px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all">Cancel</button>
                  <button onClick={() => { setStripePaymentStep('form'); setStripeClientSecret(null); }} className="px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-charcoal bg-emerald-400 hover:bg-emerald-300 transition-all">Try Again</button>
                </div>
              </div>

            ) : (
              /* Payment form */
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-display font-semibold text-white">
                    {paymentMethod === 'card' ? 'Process Card Payment' : 'Record Payment'}
                  </h3>
                  {paymentMethod === 'card' && (
                    <span className="flex items-center gap-1 text-[10px] font-body text-teal">
                      <ShieldCheck className="w-3 h-3" /> {useRealStripe ? 'Stripe' : 'Secure'}
                    </span>
                  )}
                </div>

                {/* Payment method selector */}
                <div>
                  <label className="block text-xs text-steel font-body mb-2">Payment Method</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {([
                      { value: 'card', label: 'Card', icon: '💳' },
                      { value: 'cash', label: 'Cash', icon: '💵' },
                      { value: 'bank_transfer', label: 'Transfer', icon: '🏦' },
                      { value: 'online', label: 'Online', icon: '🌐' },
                      { value: 'other', label: 'Other', icon: '📋' },
                    ] as const).map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => { setPaymentMethod(m.value); setStripeClientSecret(null); }}
                        className={cn(
                          'flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-body transition-all border',
                          paymentMethod === m.value
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-semibold'
                            : 'bg-white/[0.03] border-white/[0.06] text-steel hover:bg-white/[0.06] hover:text-silver'
                        )}
                      >
                        <span className="text-sm">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs text-steel font-body mb-1.5">Amount (£)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => { setPaymentAmount(e.target.value); setStripeClientSecret(null); }}
                      className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body placeholder:text-white/20 placeholder:italic focus:outline-none focus:ring-1 focus:ring-gold/30"
                      placeholder="0.00"
                      autoFocus
                    />
                    {folio.balance > 0 && (
                      <button
                        onClick={() => { setPaymentAmount(folio.balance.toFixed(2)); setStripeClientSecret(null); }}
                        className="px-3 py-2.5 rounded-xl text-[10px] font-body font-semibold text-teal border border-teal/20 hover:bg-teal/10 transition-all whitespace-nowrap"
                      >
                        Full Balance
                      </button>
                    )}
                  </div>
                </div>

                {/* Card payment section */}
                {paymentMethod === 'card' && paymentAmount && Number(paymentAmount) > 0 ? (
                  useRealStripe ? (
                    /* Real Stripe Elements */
                    stripeClientSecret ? (
                      <Elements stripe={stripeInstance} options={{ clientSecret: stripeClientSecret, appearance: stripeDarkAppearance }}>
                        <StripePaymentDialogInner
                          amount={Number(paymentAmount)}
                          onSuccess={handleStripePaymentSuccess}
                          onError={handleStripePaymentError}
                        />
                      </Elements>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-steel text-sm font-body">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing secure payment…
                      </div>
                    )
                  ) : (
                    /* Demo card processing */
                    <>
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={closePaymentDialog}
                          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={processDemoCardPayment}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-charcoal bg-emerald-400 hover:bg-emerald-300 transition-all"
                        >
                          <CreditCard className="w-4 h-4" />
                          Process Payment
                        </button>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-steel/40">
                        <Shield className="w-3 h-3" />
                        <span>Demo mode — simulated card processing</span>
                      </div>
                    </>
                  )
                ) : paymentMethod === 'card' ? (
                  /* Card selected but no amount yet */
                  <div className="text-center py-4 text-steel text-xs font-body">Enter an amount to process</div>
                ) : (
                  /* Non-card payment methods */
                  <>
                    <div>
                      <label className="block text-xs text-steel font-body mb-1.5">Reference / Notes <span className="text-steel/50">(optional)</span></label>
                      <input
                        type="text"
                        value={paymentDesc}
                        onChange={(e) => setPaymentDesc(e.target.value)}
                        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body placeholder:text-white/20 placeholder:italic focus:outline-none focus:ring-1 focus:ring-gold/30"
                        placeholder="e.g. Receipt number, transfer ref"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={closePaymentDialog}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!paymentAmount) return;
                          folio.postPayment.mutate({
                            amount: Number(paymentAmount),
                            payment_method: paymentMethod,
                            description: paymentDesc || undefined,
                          });
                          closePaymentDialog();
                        }}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-charcoal bg-emerald-400 hover:bg-emerald-300 transition-all"
                      >
                        Record Payment
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Deposit Dialog */}
      {showDepositDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Collect deposit" onClick={() => setShowDepositDialog(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-display font-semibold text-white">Record Deposit</h3>
            <p className="text-xs text-steel font-body -mt-3">Pre-payment held against future charges.</p>
            <div>
              <label className="block text-xs text-steel font-body mb-1.5">Payment Method</label>
              <select
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body focus:outline-none focus:ring-1 focus:ring-gold/30"
              >
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-steel font-body mb-1.5">Amount (£)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body placeholder:text-white/20 placeholder:italic focus:outline-none focus:ring-1 focus:ring-gold/30"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDepositDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!depositAmount || Number(depositAmount) <= 0) return;
                  folio.postDeposit.mutate({
                    amount: Number(depositAmount),
                    payment_method: depositMethod,
                  });
                  setShowDepositDialog(false);
                  setDepositAmount('');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-white bg-blue-500 hover:bg-blue-400 transition-all"
              >
                Record Deposit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Dialog */}
      {showRefundDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Process refund" onClick={() => setShowRefundDialog(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-display font-semibold text-rose-400">Process Refund</h3>
            <p className="text-xs text-steel font-body -mt-3">Max refundable: £{folio.totalPayments.toFixed(2)}</p>
            <div>
              <label className="block text-xs text-steel font-body mb-1.5">Reason</label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body focus:outline-none focus:ring-1 focus:ring-gold/30"
              >
                <option value="">Select a reason…</option>
                <option value="Overcharge correction">Overcharge correction</option>
                <option value="Service complaint">Service complaint</option>
                <option value="Cancellation refund">Cancellation refund</option>
                <option value="Early departure refund">Early departure refund</option>
                <option value="Duplicate payment">Duplicate payment</option>
                <option value="Goodwill gesture">Goodwill gesture</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-steel font-body mb-1.5">Refund Method</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body focus:outline-none focus:ring-1 focus:ring-gold/30"
              >
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-steel font-body mb-1.5">Amount (£)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={folio.totalPayments}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body placeholder:text-white/20 placeholder:italic focus:outline-none focus:ring-1 focus:ring-gold/30"
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowRefundDialog(false); setRefundReason(''); setRefundAmount(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!refundAmount || Number(refundAmount) <= 0 || !refundReason) return;
                  if (Number(refundAmount) > folio.totalPayments) {
                    toast.error('Refund cannot exceed total payments');
                    return;
                  }
                  folio.postRefund.mutate({
                    amount: Number(refundAmount),
                    payment_method: refundMethod,
                    reason: refundReason,
                  });
                  setShowRefundDialog(false);
                  setRefundAmount('');
                  setRefundReason('');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-white bg-rose-500 hover:bg-rose-400 transition-all"
              >
                Process Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Blocked — Outstanding Balance Dialog */}
      {showCheckoutBlockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Checkout blocked" onClick={() => setShowCheckoutBlockDialog(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-display font-semibold text-white">Outstanding Balance</h3>
                <p className="text-xs text-steel font-body mt-0.5">This folio must be settled before checkout</p>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
              <div className="flex justify-between text-sm font-body">
                <span className="text-steel">Total Charges</span>
                <span className="text-white">£{folio.totalCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-steel">Payments Received</span>
                <span className="text-emerald-400">£{folio.totalPayments.toFixed(2)}</span>
              </div>
              <Separator variant="dark" />
              <div className="flex justify-between text-sm font-body font-semibold">
                <span className="text-white">Balance Due</span>
                <span className="text-gold text-base font-display">£{folio.balance.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowCheckoutBlockDialog(false);
                  setPaymentAmount(folio.balance.toFixed(2));
                  setShowPaymentDialog(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-left"
              >
                <DollarSign size={16} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-body font-semibold text-emerald-300">Settle Balance</p>
                  <p className="text-[11px] text-steel font-body">Record a payment of £{folio.balance.toFixed(2)}</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCheckoutBlockDialog(false);
                  setClSelectedCompany('');
                  setClSelectedEntryIds(new Set());
                  setShowCityLedgerDialog(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 transition-all text-left"
              >
                <Building size={16} className="text-blue-400 shrink-0" />
                <div>
                  <p className="text-sm font-body font-semibold text-blue-300">Transfer to City Ledger</p>
                  <p className="text-[11px] text-steel font-body">Select items & company to billback</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowCheckoutBlockDialog(false)}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cancellation Policy Dialog */}
      {showCancelDialog && booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Cancel booking" onClick={() => setShowCancelDialog(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center">
                <AlertCircle size={20} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-display font-semibold text-white">Cancel Booking</h3>
                <p className="text-xs text-steel font-body mt-0.5">Apply cancellation policy</p>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
              <div className="flex justify-between text-sm font-body">
                <span className="text-steel">Total Room Charges</span>
                <span className="text-white">£{feeBase.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-steel font-body mb-1.5">Cancellation Fee</label>
              <select
                value={cancelFeePercent}
                onChange={(e) => setCancelFeePercent(Number(e.target.value))}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body focus:outline-none focus:ring-1 focus:ring-gold/30"
              >
                <option value={0}>No fee — full refund</option>
                <option value={25}>25% — late cancellation</option>
                <option value={50}>50% — short notice</option>
                <option value={100}>100% — non-refundable</option>
              </select>
            </div>

            {cancelFeePercent > 0 && (
              <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 p-3">
                <p className="text-xs text-rose-300 font-body">
                  Cancellation fee: <span className="font-semibold">£{(feeBase * cancelFeePercent / 100).toFixed(2)}</span>
                  {' '}({cancelFeePercent}% of room charges)
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowCancelDialog(false); setCancelFeePercent(0); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all"
              >
                Keep Booking
              </button>
              <button
                onClick={() => {
                  // Post cancellation fee if applicable
                  if (cancelFeePercent > 0 && feeBase > 0) {
                    folio.postCharge.mutate({
                      category: 'other',
                      description: `Cancellation fee (${cancelFeePercent}%)`,
                      quantity: 1,
                      unit_price: feeBase * cancelFeePercent / 100,
                      notes: 'Automated cancellation policy charge',
                    });
                  }
                  updateStatus.mutate({ bookingId: booking.id, status: 'cancelled' });
                  setShowCancelDialog(false);
                  setCancelFeePercent(0);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-white bg-rose-500 hover:bg-rose-400 transition-all"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No-Show Dialog */}
      {showNoShowDialog && booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Mark as no-show" onClick={() => setShowNoShowDialog(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-display font-semibold text-white">Mark as No-Show</h3>
                <p className="text-xs text-steel font-body mt-0.5">Guest did not arrive — apply no-show policy</p>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
              <div className="flex justify-between text-sm font-body">
                <span className="text-steel">Total Room Charges</span>
                <span className="text-white">£{feeBase.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-steel">Check-in Date</span>
                <span className="text-white">{format(parseISO(booking.check_in), 'dd MMM yyyy')}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-steel font-body mb-1.5">No-Show Fee</label>
              <select
                value={noShowFeePercent}
                onChange={(e) => setNoShowFeePercent(Number(e.target.value))}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 text-sm text-white font-body focus:outline-none focus:ring-1 focus:ring-gold/30"
              >
                <option value={100}>100% — full stay charge (standard)</option>
                <option value={50}>50% — partial charge</option>
                <option value={0}>Waive fee — no charge</option>
              </select>
            </div>

            {noShowFeePercent > 0 && (
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
                <p className="text-xs text-amber-300 font-body">
                  No-show fee: <span className="font-semibold">£{(feeBase * noShowFeePercent / 100).toFixed(2)}</span>
                  {' '}({noShowFeePercent}% of booking value)
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowNoShowDialog(false); setNoShowFeePercent(100); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  // Post no-show fee if applicable
                  if (noShowFeePercent > 0 && feeBase > 0) {
                    folio.postCharge.mutate({
                      category: 'other',
                      description: `No-show fee (${noShowFeePercent}%)`,
                      quantity: 1,
                      unit_price: feeBase * noShowFeePercent / 100,
                      notes: 'Automated no-show policy charge',
                    });
                  }
                  updateStatus.mutate({ bookingId: booking.id, status: 'no_show' });
                  setShowNoShowDialog(false);
                  setNoShowFeePercent(100);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-charcoal bg-amber-400 hover:bg-amber-300 transition-all"
              >
                Confirm No-Show
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* City Ledger Transfer Dialog    */}
      {/* ============================== */}
      {showCityLedgerDialog && booking && (() => {
        const transferableEntries = folio.entries.filter(e => !e.is_voided && e.type === 'charge');
        const selectedTotal = transferableEntries
          .filter(e => clSelectedEntryIds.has(e.id))
          .reduce((sum, e) => sum + e.amount, 0);
        const allSelected = transferableEntries.length > 0 && clSelectedEntryIds.size === transferableEntries.length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Transfer to City Ledger" onClick={() => setShowCityLedgerDialog(false)}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
            <div className="relative w-full max-w-lg rounded-2xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
                  <Building size={18} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-display font-semibold text-white">Transfer to City Ledger</h3>
                  <p className="text-[11px] text-steel font-body">Select a company and the items to billback</p>
                </div>
              </div>

              {/* Company Selection */}
              <div>
                <label className="block text-xs text-steel font-body mb-2">Company Account</label>
                <select
                  value={clSelectedCompany}
                  onChange={e => setClSelectedCompany(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white font-body focus:outline-none focus:border-blue-500/40 transition-colors [&>option]:bg-[#0f1724] [&>option]:text-white"
                >
                  <option value="" className="bg-[#0f1724]">— Select company —</option>
                  {cityLedgerCompanies.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#0f1724]">{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Item Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-steel font-body">Select Items to Transfer</label>
                  <button
                    onClick={() => {
                      if (allSelected) {
                        setClSelectedEntryIds(new Set());
                      } else {
                        setClSelectedEntryIds(new Set(transferableEntries.map(e => e.id)));
                      }
                    }}
                    className="text-[10px] text-blue-400 font-body font-semibold hover:underline"
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                  {transferableEntries.length === 0 && (
                    <p className="text-steel/50 text-xs font-body italic text-center py-3">No charges to transfer</p>
                  )}
                  {transferableEntries.map(entry => (
                    <label
                      key={entry.id}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all',
                        clSelectedEntryIds.has(entry.id)
                          ? 'bg-blue-500/10 border border-blue-500/20'
                          : 'border border-transparent hover:bg-white/[0.03]',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={clSelectedEntryIds.has(entry.id)}
                        onChange={() => {
                          const next = new Set(clSelectedEntryIds);
                          if (next.has(entry.id)) {
                            next.delete(entry.id);
                          } else {
                            next.add(entry.id);
                          }
                          setClSelectedEntryIds(next);
                        }}
                        className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.05] text-blue-500 focus:ring-blue-500/30 accent-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-silver font-body truncate">{entry.description}</p>
                        <p className="text-[10px] text-steel/60 font-body">{format(new Date(entry.posted_at), 'dd MMM HH:mm')}</p>
                      </div>
                      <span className="text-xs text-white font-body font-medium">£{entry.amount.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Transfer Summary */}
              {clSelectedEntryIds.size > 0 && (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-xs text-blue-300 font-body">
                    {clSelectedEntryIds.size} item{clSelectedEntryIds.size > 1 ? 's' : ''} selected
                  </span>
                  <span className="text-sm text-white font-display font-semibold">
                    £{selectedTotal.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCityLedgerDialog(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-steel border border-white/[0.08] hover:bg-white/[0.04] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!clSelectedCompany) { toast.error('Please select a company'); return; }
                    if (clSelectedEntryIds.size === 0) { toast.error('Please select at least one item'); return; }
                    const companyName = cityLedgerCompanies.find(c => c.id === clSelectedCompany)?.name ?? 'Company';
                    folio.postPayment.mutate(
                      {
                        amount: selectedTotal,
                        payment_method: 'other',
                        description: `City Ledger transfer to ${companyName} — ${clSelectedEntryIds.size} item${clSelectedEntryIds.size > 1 ? 's' : ''}`,
                      },
                      {
                        onSuccess: () => {
                          toast.success(`£${selectedTotal.toFixed(2)} transferred to ${companyName} city ledger`);
                          setShowCityLedgerDialog(false);
                          setClSelectedCompany('');
                          setClSelectedEntryIds(new Set());
                        },
                      }
                    );
                  }}
                  disabled={!clSelectedCompany || clSelectedEntryIds.size === 0}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-charcoal bg-blue-400 hover:bg-blue-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Transfer £{selectedTotal.toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================== */}
      {/* Key Card Encoding Modal        */}
      {/* ============================== */}
      <KeyCardModal
        open={showKeyCardModal}
        onClose={() => {
          setShowKeyCardModal(false);
          keyCard.resetEncoding();
          setIsMasterKeyMode(false);
        }}
        encodingProgress={keyCard.encodingProgress}
        encodedCards={encodedCards}
        guestName={`${booking.guest?.first_name ?? ''} ${booking.guest?.last_name ?? ''}`.trim()}
        roomNumber={assignedRoom?.room_number ?? '—'}
        cardType={keyCard.config.default_card_type}
        numCards={isMasterKeyMode ? 1 : keyCard.config.cards_per_booking}
        providerName={keyCard.providers.find(p => p.id === keyCard.config.provider)?.name ?? 'Key System'}
        isMasterKey={isMasterKeyMode}
        onEncode={async () => {
          const room = assignedRoom;
          if (!room) return;
          try {
            const cards = await keyCard.encodeKeyCard(booking, room, { isMaster: isMasterKeyMode });
            setEncodedCards(cards);
          } catch { /* error shown in modal */ }
        }}
        onDone={() => {
          setShowKeyCardModal(false);
          keyCard.resetEncoding();
          if (!isMasterKeyMode) {
            updateStatus.mutate({ bookingId: booking.id, status: 'checked_in' });
          }
          setIsMasterKeyMode(false);
        }}
        autoStart={!isMasterKeyMode && keyCard.config.auto_encode_on_checkin}
      />
    </div>
  );
}
