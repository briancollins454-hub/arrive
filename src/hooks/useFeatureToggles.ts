import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import type { FeatureKey, FeatureToggle } from '@/types';
import toast from 'react-hot-toast';

// ============================================================
// All features with metadata for the UI
// ============================================================

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
  description: string;
  category: 'core' | 'revenue' | 'operations' | 'communication' | 'addon';
}

export const ALL_FEATURES: FeatureMeta[] = [
  // Core — typically always on
  { key: 'booking_engine',     label: 'Booking Engine',        description: 'Public booking website for guests',                     category: 'core' },
  { key: 'housekeeping',       label: 'Housekeeping',          description: 'Room cleaning status and scheduling',                   category: 'core' },
  { key: 'payments',           label: 'Payments',              description: 'Stripe payment processing and folios',                  category: 'core' },

  // Operations
  { key: 'concierge',          label: 'Concierge',             description: 'Guest requests and concierge desk',                     category: 'operations' },
  { key: 'maintenance',        label: 'Maintenance',           description: 'Work orders and maintenance tracking',                  category: 'operations' },
  { key: 'lost_found',         label: 'Lost & Found',          description: 'Track lost and found items',                            category: 'operations' },
  { key: 'night_audit',        label: 'Night Audit',           description: 'End-of-day reconciliation and reports',                 category: 'operations' },
  { key: 'staff_rota',         label: 'Staff Rota',            description: 'Staff scheduling and shift management',                 category: 'operations' },
  { key: 'waitlist',           label: 'Waitlist',              description: 'Overbooking waitlist management',                       category: 'operations' },
  { key: 'group_bookings',     label: 'Group Bookings',        description: 'Block bookings for groups and events',                  category: 'operations' },

  // Revenue
  { key: 'packages',           label: 'Packages',              description: 'Bed & breakfast, romance packages, etc.',               category: 'revenue' },
  { key: 'financials',         label: 'Financials',            description: 'Financial dashboard and reporting',                     category: 'revenue' },
  { key: 'city_ledger',        label: 'City Ledger',           description: 'Corporate billing and company accounts',                category: 'revenue' },
  { key: 'channel_manager',    label: 'Channel Manager',       description: 'OTA integrations (Booking.com, Expedia, etc.)',         category: 'revenue' },
  { key: 'rate_intelligence',  label: 'Rate Intelligence',     description: 'Competitor rate monitoring and pricing AI',             category: 'revenue' },
  { key: 'reports',            label: 'Reports',               description: 'Advanced reporting and data export',                    category: 'revenue' },

  // Communication
  { key: 'guest_messaging',    label: 'Guest Messaging',       description: 'SMS, email, and WhatsApp guest chat',                   category: 'communication' },
  { key: 'email_templates',    label: 'Email Templates',       description: 'Automated email workflows and templates',               category: 'communication' },
  { key: 'guest_lifecycle',    label: 'Guest Lifecycle',       description: 'Pre-arrival emails, post-stay review requests, campaigns', category: 'communication' },
  { key: 'self_checkin',       label: 'Self Check-In',         description: 'Guest-facing online check-in with arrival time + ID',   category: 'communication' },

  // Add-on
  { key: 'ai_assistant',       label: 'AI Assistant',          description: 'Claude-powered AI with full property data access',      category: 'addon' },
];

// Default toggles for new properties (everything on except paid add-ons)
const DEFAULT_ENABLED: Record<FeatureKey, boolean> = {
  booking_engine: true,
  housekeeping: true,
  payments: true,
  concierge: true,
  maintenance: true,
  lost_found: true,
  night_audit: true,
  staff_rota: true,
  waitlist: true,
  group_bookings: true,
  packages: true,
  financials: true,
  city_ledger: true,
  channel_manager: false,
  rate_intelligence: false,
  reports: true,
  guest_messaging: true,
  email_templates: true,
  guest_lifecycle: true,
  self_checkin: true,
  ai_assistant: false,
};

// Demo mode defaults
const DEMO_TOGGLES: Record<FeatureKey, boolean> = {
  ...DEFAULT_ENABLED,
  ai_assistant: true,
  channel_manager: true,
  rate_intelligence: true,
};

export function useFeatureToggles() {
  const queryClient = useQueryClient();
  const property = useAppStore((s) => s.property);
  const propertyId = property?.id;

  const { data: toggles = [], isLoading } = useQuery({
    queryKey: ['feature-toggles', propertyId],
    queryFn: async () => {
      if (isDemoMode || !propertyId) {
        return ALL_FEATURES.map((f): FeatureToggle => ({
          id: f.key,
          property_id: propertyId ?? 'demo',
          feature_key: f.key,
          enabled: DEMO_TOGGLES[f.key],
          updated_by: null,
          updated_at: new Date().toISOString(),
        }));
      }

      const { data, error } = await supabase
        .from('property_feature_toggles')
        .select('*')
        .eq('property_id', propertyId);

      if (error) throw error;

      // Merge DB rows with defaults for any missing features
      const dbMap = new Map((data ?? []).map((r: FeatureToggle) => [r.feature_key, r]));
      return ALL_FEATURES.map((f): FeatureToggle => {
        const existing = dbMap.get(f.key);
        if (existing) return existing;
        return {
          id: f.key,
          property_id: propertyId,
          feature_key: f.key,
          enabled: DEFAULT_ENABLED[f.key],
          updated_by: null,
          updated_at: new Date().toISOString(),
        };
      });
    },
    enabled: !!propertyId || isDemoMode,
  });

  const toggleFeature = useMutation({
    mutationFn: async ({ featureKey, enabled }: { featureKey: FeatureKey; enabled: boolean }) => {
      if (isDemoMode) {
        return { feature_key: featureKey, enabled };
      }

      const { error } = await supabase
        .from('property_feature_toggles')
        .upsert({
          property_id: propertyId!,
          feature_key: featureKey,
          enabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'property_id,feature_key' });

      if (error) throw error;
      return { feature_key: featureKey, enabled };
    },
    onSuccess: (result) => {
      if (isDemoMode) {
        queryClient.setQueryData(['feature-toggles', propertyId], (old: FeatureToggle[] | undefined) =>
          (old ?? []).map((t) => t.feature_key === result.feature_key ? { ...t, enabled: result.enabled } : t)
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ['feature-toggles', propertyId] });
      }
      const meta = ALL_FEATURES.find((f) => f.key === result.feature_key);
      toast.success(`${meta?.label ?? result.feature_key} ${result.enabled ? 'enabled' : 'disabled'}`);
    },
    onError: () => {
      toast.error('Failed to update feature toggle');
    },
  });

  // Helper to check if a feature is on
  const isEnabled = (key: FeatureKey): boolean => {
    const toggle = toggles.find((t) => t.feature_key === key);
    return toggle?.enabled ?? DEFAULT_ENABLED[key];
  };

  return {
    toggles,
    isLoading,
    isEnabled,
    toggleFeature,
    allFeatures: ALL_FEATURES,
  };
}
