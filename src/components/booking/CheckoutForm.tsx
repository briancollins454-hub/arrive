import { type FC, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutSchema, type CheckoutFormData } from '@/lib/validators';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Lock, CreditCard, ShieldCheck, CheckCircle, Loader2 } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, isStripeConfigured, stripeLightAppearance } from '@/lib/stripe';
import type { Stripe } from '@stripe/stripe-js';

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormData, paymentIntentId?: string) => void;
  isLoading?: boolean;
  totalAmount: number;
  currency?: string;
  clientSecret?: string | null;
}

// ============================================================
// Stripe Payment Sub-Form (rendered inside <Elements>)
// ============================================================

const StripePaymentForm: FC<{
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  totalFormatted: string;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
}> = ({ onPaymentSuccess, onPaymentError, totalFormatted, isSubmitting, setIsSubmitting }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);

  const handleStripeSubmit = async () => {
    if (!stripe || !elements) return;
    setIsSubmitting(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // Fallback — we handle inline
      },
      redirect: 'if_required',
    });

    if (error) {
      onPaymentError(error.message ?? 'Payment failed');
      setIsSubmitting(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onPaymentSuccess(paymentIntent.id);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement
        onReady={() => setReady(true)}
        options={{
          layout: 'tabs',
        }}
      />
      {ready && (
        <Button
          type="button"
          className="w-full"
          size="lg"
          disabled={!stripe || isSubmitting}
          onClick={handleStripeSubmit}
        >
          {isSubmitting ? (
            <><Loader2 size={16} className="mr-2 animate-spin" /> Processing…</>
          ) : (
            <><Lock size={16} className="mr-2" /> Pay {totalFormatted} & Confirm Booking</>
          )}
        </Button>
      )}
      <div className="flex items-center justify-center gap-2 text-[11px] text-steel">
        <ShieldCheck size={12} />
        <span>Payments secured by Stripe. Card details never touch our servers.</span>
      </div>
    </div>
  );
};

// ============================================================
// Main Checkout Form
// ============================================================

export const CheckoutForm: FC<CheckoutFormProps> = ({
  onSubmit,
  isLoading,
  totalAmount,
  currency = 'GBP',
  clientSecret,
}) => {
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const [stripePaymentSuccess, setStripePaymentSuccess] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

  useEffect(() => {
    if (isStripeConfigured) {
      getStripe().then(s => setStripeInstance(s));
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  const formattedTotal = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(totalAmount);

  const handleFormSubmit = (data: CheckoutFormData) => {
    onSubmit(data, stripePaymentSuccess ?? undefined);
  };

  const showStripeElements = isStripeConfigured && stripeInstance && clientSecret;
  const paymentReady = !isStripeConfigured || !!stripePaymentSuccess;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <h2 className="text-xl font-display text-midnight">Your Details</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>First Name *</Label>
          <Input {...register('first_name')} placeholder="John" />
          {errors.first_name && (
            <p className="text-xs text-danger mt-1">{errors.first_name.message}</p>
          )}
        </div>
        <div>
          <Label>Last Name *</Label>
          <Input {...register('last_name')} placeholder="Smith" />
          {errors.last_name && (
            <p className="text-xs text-danger mt-1">{errors.last_name.message}</p>
          )}
        </div>
        <div>
          <Label>Email *</Label>
          <Input type="email" {...register('email')} placeholder="john@email.com" />
          {errors.email && (
            <p className="text-xs text-danger mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <Label>Phone *</Label>
          <Input {...register('phone')} placeholder="+44 7700 123456" />
          {errors.phone && (
            <p className="text-xs text-danger mt-1">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label>Special Requests</Label>
        <Textarea {...register('special_requests')} placeholder="Any special requests or preferences…" rows={3} />
      </div>

      {/* Stripe Elements Payment */}
      <div className="rounded-xl border border-cloud bg-snow p-5">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={18} className="text-gold" />
          <h3 className="text-sm font-semibold text-midnight font-body">Payment</h3>
        </div>

        {showStripeElements ? (
          <>
            {stripePaymentSuccess ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 font-body">Payment authorised</p>
                  <p className="text-xs text-emerald-600 font-body mt-0.5">Click below to confirm your booking.</p>
                </div>
              </div>
            ) : (
              <Elements stripe={stripeInstance} options={{ clientSecret, appearance: stripeLightAppearance }}>
                <StripePaymentForm
                  onPaymentSuccess={(id) => {
                    setStripePaymentSuccess(id);
                    setStripeError(null);
                  }}
                  onPaymentError={(msg) => setStripeError(msg)}
                  totalFormatted={formattedTotal}
                  isSubmitting={isPaymentSubmitting}
                  setIsSubmitting={setIsPaymentSubmitting}
                />
              </Elements>
            )}
            {stripeError && (
              <p className="text-xs text-danger mt-2 font-body">{stripeError}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-steel font-body mb-3">
              Secure payment processing powered by Stripe. Your card details are encrypted and never stored on our servers.
            </p>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-body space-y-1">
              <div className="flex items-center justify-center gap-2 text-emerald-700">
                <ShieldCheck size={16} />
                <span className="font-medium">Demo Mode — No payment required</span>
              </div>
              <p className="text-xs text-emerald-600">
                Set VITE_STRIPE_PUBLISHABLE_KEY to enable live Stripe checkout.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Submit — only shown when Stripe is not handling it, or payment is already confirmed */}
      {(!showStripeElements || stripePaymentSuccess) && (
        <>
          <Button type="submit" className="w-full" size="lg" disabled={isLoading || !paymentReady}>
            <Lock size={16} className="mr-2" />
            {isLoading ? 'Processing…' : stripePaymentSuccess ? 'Confirm Booking' : `Pay ${formattedTotal} & Confirm Booking`}
          </Button>

          <p className="text-center text-[11px] text-steel font-body">
            By completing this booking you agree to the property&apos;s cancellation policy.
            Your payment is secure and encrypted.
          </p>
        </>
      )}
    </form>
  );
};
