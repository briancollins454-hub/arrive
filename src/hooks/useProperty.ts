import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { supabase, isDemoMode } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Property } from '@/types';

/** Demo properties — multi-hotel portfolio for demonstration */
const demoProperties: Property[] = [
  {
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
    stripe_publishable_key: null,
    stripe_secret_key: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-property-2',
    name: 'The Riverside Inn',
    slug: 'riverside-inn',
    description: 'A charming 8-room riverside boutique hotel.',
    address: {
      line1: '42 River Walk',
      line2: '',
      city: 'Bath',
      county: 'Somerset',
      postcode: 'BA1 2QF',
      country: 'United Kingdom',
    },
    contact: {
      phone: '+44 1225 987654',
      email: 'stay@riversideinn.com',
      website: 'https://riversideinn.com',
    },
    settings: {
      check_in_time: '14:00',
      check_out_time: '10:30',
      currency: 'GBP',
      timezone: 'Europe/London',
      cancellation_hours: 24,
      deposit_percentage: 10,
      tax_rate: 0.20,
      allow_same_day_booking: true,
      max_advance_days: 365,
    },
    branding: {
      primary_color: '#4F7942',
      accent_color: '#D4A853',
      logo_url: null,
      cover_images: [],
    },
    stripe_account_id: null,
    stripe_publishable_key: null,
    stripe_secret_key: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-property-3',
    name: 'Clifftop Manor',
    slug: 'clifftop-manor',
    description: 'An exclusive 6-room clifftop retreat with ocean views.',
    address: {
      line1: '1 Cliff Road',
      line2: '',
      city: 'Salcombe',
      county: 'Devon',
      postcode: 'TQ8 8JH',
      country: 'United Kingdom',
    },
    contact: {
      phone: '+44 1548 654321',
      email: 'reservations@clifftopmanor.com',
      website: 'https://clifftopmanor.com',
    },
    settings: {
      check_in_time: '16:00',
      check_out_time: '11:00',
      currency: 'GBP',
      timezone: 'Europe/London',
      cancellation_hours: 72,
      deposit_percentage: 25,
      tax_rate: 0.20,
      allow_same_day_booking: false,
      max_advance_days: 365,
    },
    branding: {
      primary_color: '#1E3A5F',
      accent_color: '#C9A84C',
      logo_url: null,
      cover_images: [],
    },
    stripe_account_id: null,
    stripe_publishable_key: null,
    stripe_secret_key: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * Returns the current property context.
 * In demo mode, provides a hard-coded sample hotel portfolio.
 */
export function useProperty() {
  const property = useAppStore((s) => s.property);
  const properties = useAppStore((s) => s.properties);
  const activePropertyId = useAppStore((s) => s.activePropertyId);
  const setProperty = useAppStore((s) => s.setProperty);
  const setProperties = useAppStore((s) => s.setProperties);
  const setActivePropertyId = useAppStore((s) => s.setActivePropertyId);
  const user = useAppStore((s) => s.user);

  // Self-healing: if authenticated in live mode but property is missing, load it once
  const triedLoading = useRef(false);
  useEffect(() => {
    if (isDemoMode || !user || property || triedLoading.current) return;
    triedLoading.current = true;

    let cancelled = false;
    (async () => {
      // Load all properties the user has access to via staff_properties junction table
      const { data: staff } = await supabase
        .from('staff_members')
        .select('*')
        .eq('id', user.id)
        .single();

      if (cancelled || !staff) return;

      const { data: staffProps } = await supabase
        .from('staff_properties')
        .select('property_id, is_primary')
        .eq('staff_id', user.id);

      const propertyIds = staffProps?.map((sp: { property_id: string }) => sp.property_id) ?? [staff.property_id];
      const primaryPropId = staffProps?.find((sp: { is_primary: boolean }) => sp.is_primary)?.property_id ?? staff.property_id;

      if (propertyIds.length === 0) {
        propertyIds.push(staff.property_id);
      }

      const { data: allProps } = await supabase
        .from('properties')
        .select('*')
        .in('id', propertyIds);

      if (cancelled || !allProps || allProps.length === 0) return;

      const primaryProp = allProps.find(p => p.id === primaryPropId) ?? allProps[0]!;
      setProperty(primaryProp);
      setProperties(allProps);
      setActivePropertyId(primaryProp.id);
    })();

    return () => { cancelled = true; };
  }, [isDemoMode, user, property, setProperty, setProperties, setActivePropertyId]);

  const allProperties = isDemoMode ? demoProperties : properties;
  const activeId = isDemoMode ? (activePropertyId ?? 'demo-property-id') : activePropertyId;
  // In live mode, always fall back to the single `property` from the store
  // (set by useAuth's loadStaffAndProperty) if the properties array is empty
  const activeProperty = activeId
    ? allProperties.find((p) => p.id === activeId) ?? allProperties[0] ?? property ?? null
    : allProperties[0] ?? property ?? null;

  const isGroupView = activeId === null || activeId === 'all';
  const hasMultipleProperties = allProperties.length > 1;

  const switchProperty = (id: string | null) => {
    if (id === 'all') {
      setActivePropertyId(null);
    } else {
      setActivePropertyId(id);
      const found = allProperties.find((p) => p.id === id);
      if (found) setProperty(found);
    }
  };

  /** Persist property updates to Supabase (live mode) */
  const updateProperty = useCallback(async (updates: Partial<Property>) => {
    if (!activeProperty) return;
    const merged = { ...activeProperty, ...updates, updated_at: new Date().toISOString() };
    // Optimistic update
    setProperty(merged);

    if (isDemoMode) {
      toast.success('Settings saved');
      return;
    }

    const { error } = await supabase
      .from('properties')
      .update({
        name: merged.name,
        slug: merged.slug,
        description: merged.description,
        address: merged.address,
        contact: merged.contact,
        settings: merged.settings,
        branding: merged.branding,
        stripe_account_id: merged.stripe_account_id,
        stripe_publishable_key: merged.stripe_publishable_key,
        stripe_secret_key: merged.stripe_secret_key,
      })
      .eq('id', activeProperty.id);

    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      // Revert
      setProperty(activeProperty);
      return;
    }
    toast.success('Settings saved');
  }, [activeProperty, setProperty]);

  /** Create a new property and link it to the current user via staff_properties */
  const createProperty = useCallback(async (details: {
    name: string;
    slug: string;
    description?: string;
    address?: Property['address'];
    contact?: Property['contact'];
  }): Promise<Property | null> => {
    if (isDemoMode) {
      const newProp: Property = {
        id: `demo-${Date.now()}`,
        name: details.name,
        slug: details.slug,
        description: details.description ?? '',
        address: details.address ?? { line1: '', line2: '', city: '', county: '', postcode: '', country: 'United Kingdom' },
        contact: details.contact ?? { phone: '', email: '', website: '' },
        settings: {
          check_in_time: '15:00', check_out_time: '11:00', currency: 'GBP', timezone: 'Europe/London',
          cancellation_hours: 48, deposit_percentage: 0, tax_rate: 0.20,
          allow_same_day_booking: true, max_advance_days: 365,
        },
        branding: { primary_color: '#D4A853', accent_color: '#0D9488', logo_url: null, cover_images: [] },
        stripe_account_id: null, stripe_publishable_key: null, stripe_secret_key: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [...allProperties, newProp];
      setProperties(updated);
      toast.success(`"${details.name}" created`);
      return newProp;
    }

    try {
      // 1. Insert the new property
      const { data: newProp, error: propErr } = await supabase.from('properties').insert({
        name: details.name.trim(),
        slug: details.slug.trim(),
        description: details.description?.trim() || null,
        address: details.address ?? {},
        contact: details.contact ?? {},
      }).select('*').single();

      if (propErr || !newProp) throw propErr ?? new Error('Failed to create property');

      // 2. Link current user to the new property via staff_properties
      if (user) {
        const currentRole = useAppStore.getState().currentRole ?? 'owner';
        const { error: linkErr } = await supabase.from('staff_properties').insert({
          staff_id: user.id,
          property_id: newProp.id,
          role: currentRole,
          is_primary: false,
        });
        if (linkErr) {
          console.error('[Arrivé] Failed to link staff to new property:', linkErr.message);
        }
      }

      // 3. Update local state with the new property added to the list
      const updated = [...allProperties, newProp];
      setProperties(updated);
      toast.success(`"${details.name}" created`);
      return newProp;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create property';
      toast.error(msg);
      return null;
    }
  }, [allProperties, setProperties, user]);

  return {
    property: activeProperty,
    propertyId: activeProperty?.id ?? null,
    properties: allProperties,
    activePropertyId: activeId,
    isGroupView,
    hasMultipleProperties,
    setProperty,
    setProperties,
    switchProperty,
    updateProperty,
    createProperty,
    isDemoMode,
  };
}
