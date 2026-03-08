import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isStripeReady } from '@/lib/stripe';
import { isDemoMode, supabase } from '@/lib/supabase';
import { useProperty } from './useProperty';
import { logActivity } from './useActivityLog';
import type { FolioEntry, Booking, PaymentMethod } from '@/types';
import toast from 'react-hot-toast';

// ============================================================
// Types
// ============================================================

export interface CreatePaymentIntentParams {
  bookingId: string;
  amount: number; // in major currency units (e.g. £10.50)
  currency?: string;
  description?: string;
}

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export type PaymentStatus = 'idle' | 'creating' | 'processing' | 'succeeded' | 'failed';

// ============================================================
// Hook
// ============================================================

/**
 * Stripe payment processing hook.
 *
 * In demo mode (no Supabase/Stripe configured), simulates the entire flow.
 * In production, calls Supabase Edge Functions to create PaymentIntents
 * server-side and uses Stripe.js to confirm them client-side.
 */
export function useStripePayment() {
  const queryClient = useQueryClient();
  const { property, propertyId } = useProperty();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const currency = property?.settings?.currency?.toLowerCase() ?? 'gbp';
  const stripeReady = isStripeReady(property?.stripe_publishable_key);

  /**
   * Create a PaymentIntent (server-side via Supabase Edge Function).
   * In demo mode, returns a fake client secret.
   */
  const createPaymentIntent = useCallback(async (params: CreatePaymentIntentParams): Promise<CreatePaymentIntentResult | null> => {
    setStatus('creating');
    setError(null);

    if (isDemoMode || !stripeReady) {
      // Simulate PaymentIntent creation
      await new Promise(r => setTimeout(r, 600));
      return {
        clientSecret: `pi_demo_${Date.now()}_secret_${Math.random().toString(36).slice(2, 10)}`,
        paymentIntentId: `pi_demo_${Date.now()}`,
      };
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: Math.round(params.amount * 100), // Convert to pence/cents
          currency,
          booking_id: params.bookingId,
          property_id: propertyId,
          description: params.description ?? `Payment for booking ${params.bookingId}`,
        },
      });

      if (fnError) {
        // supabase.functions.invoke returns the response body as data even on error
        const errorMsg = (data as Record<string, string> | null)?.error ?? fnError.message;
        throw new Error(errorMsg);
      }
      if (!data?.clientSecret) throw new Error(data?.error ?? 'No client secret returned');

      return {
        clientSecret: data.clientSecret as string,
        paymentIntentId: data.paymentIntentId as string,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create payment';
      setError(message);
      setStatus('failed');
      toast.error(message);
      return null;
    }
  }, [currency, propertyId, stripeReady]);

  /**
   * Simulate a complete payment flow (demo mode).
   * Used when Stripe is not configured.
   */
  const simulatePayment = useCallback(async (params: {
    bookingId: string;
    amount: number;
    method: PaymentMethod;
    cardLast4?: string;
    cardBrand?: string;
    reference?: string;
  }) => {
    setStatus('creating');
    setError(null);
    await new Promise(r => setTimeout(r, 800));

    setStatus('processing');
    await new Promise(r => setTimeout(r, 1500));

    // 95% success rate in demo
    const success = Math.random() > 0.05;

    if (!success) {
      setStatus('failed');
      setError('Payment declined by card issuer');
      return false;
    }

    // Post to folio
    const methodLabel = params.method === 'card'
      ? `${params.cardBrand || 'Card'} •••• ${params.cardLast4 || '4242'}`
      : params.method === 'cash' ? 'Cash' : params.method;

    const entry: FolioEntry = {
      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      booking_id: params.bookingId,
      type: 'payment',
      category: 'room',
      description: `Payment — ${methodLabel}${params.reference ? ` (Ref: ${params.reference})` : ''}`,
      amount: -params.amount,
      quantity: 1,
      unit_price: -params.amount,
      payment_method: params.method,
      posted_by: 'Stripe',
      posted_at: new Date().toISOString(),
      is_voided: false,
    };
    queryClient.setQueryData<FolioEntry[]>(['folio', params.bookingId], old => [...(old ?? []), entry]);

    // Update booking amount_paid
    queryClient.setQueryData<Booking[]>(['bookings', propertyId], (old) =>
      (old ?? []).map(b =>
        b.id === params.bookingId
          ? { ...b, amount_paid: b.amount_paid + params.amount, stripe_payment_id: `pi_demo_${Date.now()}`, updated_at: new Date().toISOString() }
          : b
      )
    );

    logActivity(queryClient, propertyId, {
      action: 'folio_payment_received',
      entity_type: 'folio',
      entity_id: params.bookingId,
      description: `Payment of £${params.amount.toFixed(2)} received via ${methodLabel}`,
      performed_by: 'Payment Terminal',
    });

    setStatus('succeeded');
    toast.success(`Payment of £${params.amount.toFixed(2)} received`);
    return true;
  }, [queryClient, propertyId]);

  /**
   * Record a successful Stripe payment in the system (after client-side confirmation).
   * Called after stripe.confirmPayment() succeeds.
   */
  const recordPayment = useCallback(async (params: {
    bookingId: string;
    amount: number;
    paymentIntentId: string;
    cardLast4?: string;
    cardBrand?: string;
  }) => {
    const methodLabel = `${params.cardBrand || 'Card'} •••• ${params.cardLast4 || '****'}`;

    const entry: FolioEntry = {
      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      booking_id: params.bookingId,
      type: 'payment',
      category: 'room',
      description: `Stripe Payment — ${methodLabel}`,
      amount: -params.amount,
      quantity: 1,
      unit_price: -params.amount,
      payment_method: 'card',
      posted_by: 'Stripe',
      posted_at: new Date().toISOString(),
      is_voided: false,
    };
    queryClient.setQueryData<FolioEntry[]>(['folio', params.bookingId], old => [...(old ?? []), entry]);

    queryClient.setQueryData<Booking[]>(['bookings', propertyId], (old) =>
      (old ?? []).map(b =>
        b.id === params.bookingId
          ? { ...b, amount_paid: b.amount_paid + params.amount, stripe_payment_id: params.paymentIntentId, updated_at: new Date().toISOString() }
          : b
      )
    );

    logActivity(queryClient, propertyId, {
      action: 'folio_payment_received',
      entity_type: 'folio',
      entity_id: params.bookingId,
      description: `Stripe payment of £${params.amount.toFixed(2)} received (${params.paymentIntentId})`,
      performed_by: 'Stripe',
    });

    setStatus('succeeded');
    toast.success(`Payment of £${params.amount.toFixed(2)} confirmed`);
  }, [queryClient, propertyId]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    error,
    isStripeConfigured: stripeReady,
    createPaymentIntent,
    simulatePayment,
    recordPayment,
    reset,
  };
}
