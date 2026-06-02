// supabase/functions/_shared/stripe.ts
// ============================================================
// Shared Stripe client for PLATFORM billing (subscriptions).
// Uses the platform's own Stripe account — NOT the per-hotel keys
// stored in property_secrets (those take guest payments).
// ============================================================

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

export function getStripe(): Stripe {
  const key = (Deno.env.get('STRIPE_SECRET_KEY') ?? '').trim();
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured on the function.');
  return new Stripe(key, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function appUrl(): string {
  return (Deno.env.get('APP_URL') ?? '').trim().replace(/\/$/, '');
}
