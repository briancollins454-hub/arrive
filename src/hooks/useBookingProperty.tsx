import { createContext, useContext, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import type { Property } from '@/types';

// ── Demo fallback (matches useProperty demo data) ────────────
const demoProperties: Property[] = [
  {
    id: 'demo-property-id', name: 'The Grand Harbour Hotel', slug: 'grand-harbour',
    description: 'A beautiful 10-room boutique hotel overlooking the harbour.',
    address: { line1: '14 Marine Parade', line2: '', city: 'Brighton', county: 'East Sussex', postcode: 'BN2 1TL', country: 'United Kingdom' },
    contact: { phone: '+44 1273 123456', email: 'hello@grandharbour.com', website: 'https://grandharbour.com' },
    settings: { check_in_time: '15:00', check_out_time: '11:00', currency: 'GBP', timezone: 'Europe/London', cancellation_hours: 48, deposit_percentage: 0, tax_rate: 0.20, allow_same_day_booking: true, max_advance_days: 365 },
    branding: { primary_color: '#D4A853', accent_color: '#0D9488', logo_url: null, cover_images: [] },
    stripe_account_id: null, stripe_publishable_key: null, stripe_secret_key: null,
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-property-2', name: 'The Riverside Inn', slug: 'riverside-inn',
    description: 'A charming 8-room riverside boutique hotel.',
    address: { line1: '42 River Walk', line2: '', city: 'Bath', county: 'Somerset', postcode: 'BA1 2QF', country: 'United Kingdom' },
    contact: { phone: '+44 1225 987654', email: 'stay@riversideinn.com', website: 'https://riversideinn.com' },
    settings: { check_in_time: '14:00', check_out_time: '10:30', currency: 'GBP', timezone: 'Europe/London', cancellation_hours: 24, deposit_percentage: 10, tax_rate: 0.20, allow_same_day_booking: true, max_advance_days: 365 },
    branding: { primary_color: '#4F7942', accent_color: '#D4A853', logo_url: null, cover_images: [] },
    stripe_account_id: null, stripe_publishable_key: null, stripe_secret_key: null,
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-property-3', name: 'Clifftop Manor', slug: 'clifftop-manor',
    description: 'An exclusive 6-room clifftop retreat with ocean views.',
    address: { line1: '1 Cliff Road', line2: '', city: 'Salcombe', county: 'Devon', postcode: 'TQ8 8JH', country: 'United Kingdom' },
    contact: { phone: '+44 1548 654321', email: 'reservations@clifftopmanor.com', website: 'https://clifftopmanor.com' },
    settings: { check_in_time: '16:00', check_out_time: '11:00', currency: 'GBP', timezone: 'Europe/London', cancellation_hours: 72, deposit_percentage: 25, tax_rate: 0.20, allow_same_day_booking: false, max_advance_days: 365 },
    branding: { primary_color: '#1E3A5F', accent_color: '#C9A84C', logo_url: null, cover_images: [] },
    stripe_account_id: null, stripe_publishable_key: null, stripe_secret_key: null,
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

// ── Context ──────────────────────────────────────────────────

interface BookingPropertyContextValue {
  property: Property | null;
  isLoading: boolean;
  error: string | null;
}

const BookingPropertyContext = createContext<BookingPropertyContextValue>({
  property: null,
  isLoading: true,
  error: null,
});

// ── Provider (used by BookingLayout) ─────────────────────────

export function BookingPropertyProvider({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();

  const { data: property, isLoading, error } = useQuery({
    queryKey: ['booking-property', slug],
    queryFn: async (): Promise<Property | null> => {
      if (!slug) return null;

      if (isDemoMode) {
        return demoProperties.find(p => p.slug === slug) ?? demoProperties[0]!;
      }

      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (fetchError || !data) return null;
      return data as Property;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // cache for 5 mins
  });

  // Seed the global app store so hooks like useRooms/useBookings/useRatePeriods
  // (which depend on useProperty().propertyId) work for public visitors too
  const setProperty = useAppStore((s) => s.setProperty);
  const setActivePropertyId = useAppStore((s) => s.setActivePropertyId);
  useEffect(() => {
    if (property) {
      setProperty(property);
      setActivePropertyId(property.id);
    }
  }, [property, setProperty, setActivePropertyId]);

  const value = useMemo(() => ({
    property: property ?? null,
    isLoading,
    error: error ? 'Failed to load property' : null,
  }), [property, isLoading, error]);

  return (
    <BookingPropertyContext.Provider value={value}>
      {children}
    </BookingPropertyContext.Provider>
  );
}

// ── Hook (used by booking pages) ─────────────────────────────

export function useBookingProperty() {
  return useContext(BookingPropertyContext);
}
