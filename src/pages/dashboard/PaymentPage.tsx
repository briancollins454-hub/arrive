import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Lock, CheckCircle, Loader2, PoundSterling, Building, Banknote,
  ArrowRight, Shield, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useBookings } from '@/hooks/useBookings';
import { useRooms } from '@/hooks/useRooms';
import { useProperty } from '@/hooks/useProperty';
import { useStripePayment } from '@/hooks/useStripePayment';
import { getFolioBalance } from '@/hooks/useFolios';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, isStripeConfigured, stripeDarkAppearance } from '@/lib/stripe';
import type { PaymentMethod, Booking } from '@/types';
import type { Stripe } from '@stripe/stripe-js';

// Simulated card processing
function formatCardNumber(value: string) {
  const v = value.replace(/\D/g, '').slice(0, 16);
  return v.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string) {
  const v = value.replace(/\D/g, '').slice(0, 4);
  if (v.length > 2) return v.slice(0, 2) + '/' + v.slice(2);
  return v;
}

type ProcessingStep = 'idle' | 'creating_intent' | 'processing' | 'authorising' | 'verifying' | 'complete' | 'failed';

// ============================================================
// Stripe Card Form (used inside <Elements> provider)
// ============================================================

function StripeCardFormInner({ onSuccess, onError, amount: paymentAmount, isProcessing, setIsProcessing }: {
  onSuccess: (paymentIntentId: string, last4?: string, brand?: string) => void;
  onError: (message: string) => void;
  amount: number;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setIsProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (error) {
      onError(error.message ?? 'Payment failed');
      setIsProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      // Extract card details from payment method if available
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
        <Button variant="teal" className="w-full py-3 text-base" disabled={!stripe || isProcessing} onClick={handleSubmit}>
          {isProcessing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
          ) : (
            <><Lock className="w-4 h-4 mr-2" /> Process £{paymentAmount.toFixed(2)} Payment<ArrowRight className="w-4 h-4 ml-2" /></>
          )}
        </Button>
      )}
    </div>
  );
}

// ============================================================
// Main Payment Page
// ============================================================

export function PaymentPage() {
  const queryClient = useQueryClient();
  const { bookings } = useBookings();
  const { rooms } = useRooms();
  useProperty();
  const {
    createPaymentIntent,
    simulatePayment,
    recordPayment,
    reset: resetStripe,
  } = useStripePayment();
  const inHouseBookings = (bookings ?? []).filter(b => b.status === 'checked_in' || b.status === 'confirmed');

  const getRoomNumber = (b: Booking) => {
    if (!b.room_id) return 'TBC';
    const room = rooms.find(r => r.id === b.room_id);
    return room ? room.room_number : 'TBC';
  };

  const [selectedBooking, setSelectedBooking] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<ProcessingStep>('idle');

  // Stripe Elements state
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isStripeProcessing, setIsStripeProcessing] = useState(false);

  // Card form (demo fallback)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  // Cash / bank form
  const [reference, setReference] = useState('');

  const booking = inHouseBookings.find(b => b.id === selectedBooking);
  const balance = booking ? getFolioBalance(queryClient, booking.id) : 0;

  // Load Stripe instance
  useEffect(() => {
    if (isStripeConfigured) {
      getStripe().then(s => setStripeInstance(s));
    }
  }, []);

  const useRealStripe = isStripeConfigured && stripeInstance && method === 'card';

  const canProcess = (() => {
    if (!selectedBooking || !amount || Number(amount) <= 0) return false;
    if (method === 'card' && !useRealStripe) {
      if (cardNumber.replace(/\s/g, '').length < 16 || cardExpiry.length < 5 || cardCvc.length < 3) return false;
    }
    return true;
  })();

  // Create a PaymentIntent when card method is selected and amount is set (Stripe mode)
  useEffect(() => {
    if (!useRealStripe || !booking || !amount || Number(amount) <= 0) {
      setClientSecret(null);
      return;
    }
    const paymentAmount = Number(amount);
    createPaymentIntent({
      bookingId: booking.id,
      amount: paymentAmount,
      description: `Payment for ${booking.confirmation_code}`,
    }).then(result => {
      if (result) setClientSecret(result.clientSecret);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useRealStripe, selectedBooking, amount]);

  // Process non-Stripe payments (cash, bank, demo card)
  const processPayment = async () => {
    if (!canProcess || !booking) return;
    const paymentAmount = Number(amount);

    const success = await simulatePayment({
      bookingId: booking.id,
      amount: paymentAmount,
      method,
      cardLast4: cardNumber.replace(/\s/g, '').slice(-4) || undefined,
      cardBrand: cardType || undefined,
      reference: reference || undefined,
    });

    setStep(success ? 'complete' : 'failed');
  };

  // Handle Stripe payment success
  const handleStripeSuccess = async (paymentIntentId: string, last4?: string, brand?: string) => {
    if (!booking) return;
    const paymentAmount = Number(amount);
    await recordPayment({
      bookingId: booking.id,
      amount: paymentAmount,
      paymentIntentId,
      cardLast4: last4,
      cardBrand: brand,
    });
    setStep('complete');
    setIsStripeProcessing(false);
  };

  const handleStripeError = (message: string) => {
    setStep('failed');
    setIsStripeProcessing(false);
    // stripeError will also be set via the hook
    console.error('[Stripe Error]', message);
  };

  const reset = () => {
    setStep('idle');
    setCardNumber(''); setCardExpiry(''); setCardCvc(''); setCardName('');
    setAmount(''); setReference('');
    setClientSecret(null);
    setIsStripeProcessing(false);
    resetStripe();
  };

  // Card type detection
  const cardType = (() => {
    const num = cardNumber.replace(/\s/g, '');
    if (num.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return 'Mastercard';
    if (num.startsWith('3') && (num[1] === '4' || num[1] === '7')) return 'Amex';
    return '';
  })();

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Payment Terminal</h1>
        <p className="text-silver text-sm mt-1">Process guest payments securely</p>
      </div>

      {/* Booking Selection */}
      <div className="glass-panel rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Select Booking</h2>
        <select
          className="input-dark w-full"
          value={selectedBooking}
          onChange={e => { setSelectedBooking(e.target.value); setAmount(''); }}
        >
          <option value="">Choose a booking...</option>
          {inHouseBookings.map(b => (
            <option key={b.id} value={b.id}>
              {b.confirmation_code} — {b.guest?.first_name} {b.guest?.last_name} — Rm {getRoomNumber(b)} — Balance: £{getFolioBalance(queryClient, b.id).toFixed(2)}
            </option>
          ))}
        </select>
        {booking && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="card-dark p-4">
              <div className="text-xs text-silver">Room</div>
              <div className="text-white font-medium">{getRoomNumber(booking)}</div>
            </div>
            <div className="card-dark p-4">
              <div className="text-xs text-silver">Rate / Night</div>
              <div className="text-white font-medium">£{booking.nightly_rate.toFixed(2)}</div>
            </div>
            <div className="card-dark p-4">
              <div className="text-xs text-silver">Folio Balance</div>
              <div className={cn('font-medium', balance > 0 ? 'text-red-400' : 'text-emerald-400')}>£{balance.toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Method & Amount */}
      {booking && step === 'idle' && (
        <>
          <div className="glass-panel rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Payment Method</h2>
            <div className="grid grid-cols-4 gap-2">
              {([
                { value: 'card', label: 'Card', icon: CreditCard },
                { value: 'cash', label: 'Cash', icon: Banknote },
                { value: 'bank_transfer', label: 'Transfer', icon: Building },
                { value: 'other', label: 'Other', icon: PoundSterling },
              ] as const).map(m => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all',
                    method === m.value ? 'bg-teal/10 border-teal/30 text-teal' : 'border-white/[0.06] text-silver hover:border-white/[0.15]'
                  )}
                >
                  <m.icon className="w-5 h-5" />
                  <span className="text-xs">{m.label}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-silver mb-1">Amount (£)</label>
              <div className="flex items-center gap-2">
                <input
                  className="input-dark flex-1 text-lg"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                />
                {balance > 0 && (
                  <Button variant="outline-dark" size="sm" onClick={() => setAmount(balance.toFixed(2))}>
                    Full Balance
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Card Details */}
          {method === 'card' && (
            <div className="glass-panel rounded-xl p-5 space-y-4 border border-teal/10">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Card Details</h2>
                <div className="flex items-center gap-1 text-xs text-silver">
                  <Lock className="w-3 h-3" /> Secure
                  {useRealStripe ? (
                    <span className="ml-2 text-teal font-medium flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Stripe</span>
                  ) : (
                    cardType && <span className="ml-2 text-teal font-medium">{cardType}</span>
                  )}
                </div>
              </div>

              {useRealStripe && clientSecret ? (
                <Elements stripe={stripeInstance} options={{ clientSecret, appearance: stripeDarkAppearance }}>
                  <StripeCardFormInner
                    onSuccess={handleStripeSuccess}
                    onError={handleStripeError}
                    amount={Number(amount || 0)}
                    isProcessing={isStripeProcessing}
                    setIsProcessing={setIsStripeProcessing}
                  />
                </Elements>
              ) : useRealStripe && !clientSecret ? (
                <div className="flex items-center justify-center py-6 text-silver text-sm">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing secure payment…
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-silver mb-1">Card Number</label>
                    <input
                      className="input-dark w-full text-lg tracking-wider font-mono"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-silver mb-1">Expiry</label>
                      <input
                        className="input-dark w-full font-mono"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-silver mb-1">CVC</label>
                      <input
                        className="input-dark w-full font-mono"
                        placeholder="123"
                        type="password"
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-silver mb-1">Cardholder Name</label>
                    <input
                      className="input-dark w-full"
                      placeholder="Name on card"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bank / Cash Reference */}
          {(method === 'cash' || method === 'bank_transfer' || method === 'other') && (
            <div className="glass-panel rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">
                {method === 'cash' ? 'Cash Payment' : method === 'bank_transfer' ? 'Bank Transfer' : 'Other Payment'}
              </h2>
              <div>
                <label className="block text-xs text-silver mb-1">Reference / Receipt Number</label>
                <input className="input-dark w-full" placeholder="Reference..." value={reference} onChange={e => setReference(e.target.value)} />
              </div>
            </div>
          )}

          {/* Process Button — hidden when using real Stripe (StripeCardFormInner has its own) */}
          {!(useRealStripe && clientSecret) && (
            <Button variant="teal" className="w-full py-3 text-base" disabled={!canProcess} onClick={processPayment}>
              <Lock className="w-4 h-4 mr-2" />
              Process £{Number(amount || 0).toFixed(2)} Payment
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-silver/50">
            {isStripeConfigured ? (
              <><ShieldCheck className="w-3 h-3" /><span>Powered by Stripe — payments are processed securely</span></>
            ) : (
              <><Shield className="w-3 h-3" /><span>Demo mode — no real charges will be made</span></>
            )}
          </div>
        </>
      )}

      {/* Processing States */}
      {step !== 'idle' && step !== 'complete' && step !== 'failed' && (
        <div className="glass-panel rounded-xl p-8 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-teal animate-spin mx-auto" />
          <div>
            <p className="text-white font-medium text-lg">
              {step === 'processing' && 'Processing payment...'}
              {step === 'authorising' && 'Authorising with bank...'}
              {step === 'verifying' && 'Verifying transaction...'}
            </p>
            <p className="text-silver text-sm mt-1">£{Number(amount || 0).toFixed(2)} via {method}</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            {['processing', 'authorising', 'verifying'].map((s, i) => (
              <div
                key={s}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  s === step ? 'bg-teal scale-125' :
                  ['processing', 'authorising', 'verifying'].indexOf(step) > i ? 'bg-teal' : 'bg-white/10'
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Success */}
      {step === 'complete' && (
        <div className="glass-panel rounded-xl p-8 text-center space-y-4 border border-emerald-500/20">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
          <div>
            <p className="text-white font-semibold text-xl">Payment Successful</p>
            <p className="text-silver text-sm mt-1">
              £{Number(amount || 0).toFixed(2)} received via {method === 'card' ? `${cardType || 'Card'} •••• ${cardNumber.replace(/\s/g, '').slice(-4)}` : method}
            </p>
            <p className="text-teal text-sm mt-1">{booking?.confirmation_code} — {booking?.guest?.first_name} {booking?.guest?.last_name}</p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="ghost-dark" onClick={reset}>New Payment</Button>
            <Button variant="outline-dark" onClick={() => window.print()}>Print Receipt</Button>
          </div>
        </div>
      )}

      {/* Failed */}
      {step === 'failed' && (
        <div className="glass-panel rounded-xl p-8 text-center space-y-4 border border-red-500/20">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-xl">Payment Declined</p>
            <p className="text-silver text-sm mt-1">The card issuer has declined this transaction. Please try a different card or payment method.</p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="ghost-dark" onClick={() => setStep('idle')}>Try Again</Button>
          </div>
        </div>
      )}
    </div>
  );
}
