import { loadStripe, type Stripe } from '@stripe/stripe-js';

// ============================================================
// Stripe Configuration
// ============================================================

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';

/** True when Stripe is not configured — use simulated payments */
export const isStripeConfigured = !!publishableKey;

if (!isStripeConfigured) {
  console.warn(
    '[Arrivé] VITE_STRIPE_PUBLISHABLE_KEY is not set. ' +
    'Payments will be simulated in demo mode. ' +
    'Set VITE_STRIPE_PUBLISHABLE_KEY in .env.local to enable real payments.'
  );
}

/**
 * Lazy-loaded Stripe instance.
 * Returns null when Stripe is not configured (demo mode).
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!isStripeConfigured) return Promise.resolve(null);
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

// ============================================================
// Stripe Appearance — matches Arrivé's dark glassmorphism theme
// ============================================================

/** Stripe Elements appearance config for the dashboard (dark theme) */
export const stripeDarkAppearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#0ea5a0',
    colorBackground: '#0d1117',
    colorText: '#c8ccd4',
    colorDanger: '#ef4444',
    colorTextPlaceholder: '#5a6270',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    fontSizeBase: '14px',
    borderRadius: '10px',
    spacingUnit: '4px',
    colorIconCardCvc: '#c9a84c',
    colorIconCardError: '#ef4444',
  },
  rules: {
    '.Input': {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: 'none',
      padding: '12px 14px',
    },
    '.Input:focus': {
      border: '1px solid rgba(14, 165, 160, 0.4)',
      boxShadow: '0 0 0 2px rgba(14, 165, 160, 0.15)',
    },
    '.Input:hover': {
      border: '1px solid rgba(255, 255, 255, 0.15)',
    },
    '.Label': {
      color: '#8b929e',
      fontSize: '11px',
      fontWeight: '500',
      marginBottom: '6px',
    },
    '.Tab': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      color: '#8b929e',
    },
    '.Tab--selected': {
      backgroundColor: 'rgba(14, 165, 160, 0.1)',
      border: '1px solid rgba(14, 165, 160, 0.3)',
      color: '#0ea5a0',
    },
    '.Tab:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      color: '#c8ccd4',
    },
  },
};

/** Stripe Elements appearance config for the booking engine (light theme) */
export const stripeLightAppearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#0ea5a0',
    colorBackground: '#ffffff',
    colorText: '#1a1a2e',
    colorDanger: '#ef4444',
    colorTextPlaceholder: '#9ca3af',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    fontSizeBase: '14px',
    borderRadius: '10px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: '1px solid #e5e7eb',
      padding: '12px 14px',
    },
    '.Input:focus': {
      border: '1px solid rgba(14, 165, 160, 0.5)',
      boxShadow: '0 0 0 3px rgba(14, 165, 160, 0.1)',
    },
    '.Label': {
      color: '#6b7280',
      fontSize: '12px',
      fontWeight: '500',
    },
  },
};
