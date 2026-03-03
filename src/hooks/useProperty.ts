import { useAppStore } from '@/store/useAppStore';
import { isDemoMode } from '@/lib/supabase';
import type { Property } from '@/types';

/** Demo property used when no Supabase connection is available */
const demoProperty: Property = {
  id: 'demo-property-id',
  name: 'The Grand Harbour Hotel',
  slug: 'grand-harbour',
  description: 'A beautiful 10-room boutique hotel overlooking the harbour.',
  address: {
    line1: '14 Marine Parade',
    line2: '',
    city: 'Brighton',
    county: 'East Sussex',
    postcode: 'BN2 1TL',
    country: 'United Kingdom',
  },
  contact: {
    phone: '+44 1273 123456',
    email: 'hello@grandharbour.com',
    website: 'https://grandharbour.com',
  },
  settings: {
    check_in_time: '15:00',
    check_out_time: '11:00',
    currency: 'GBP',
    timezone: 'Europe/London',
    cancellation_hours: 48,
    deposit_percentage: 0,
    tax_rate: 0.20,
    allow_same_day_booking: true,
    max_advance_days: 365,
  },
  branding: {
    primary_color: '#D4A853',
    accent_color: '#0D9488',
    logo_url: null,
    cover_images: [],
  },
  stripe_account_id: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Returns the current property context.
 * In demo mode, provides a hard-coded sample hotel.
 */
export function useProperty() {
  const property = useAppStore((s) => s.property);
  const setProperty = useAppStore((s) => s.setProperty);

  const activeProperty = isDemoMode ? demoProperty : property;

  return {
    property: activeProperty,
    propertyId: activeProperty?.id ?? null,
    setProperty,
    isDemoMode,
  };
}
