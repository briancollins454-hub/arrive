import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import toast from 'react-hot-toast';

export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended' | 'incomplete';

export interface SubscriptionPlan {
  code: string;
  name: string;
  monthly_price_pence: number;
  room_min: number | null;
  room_max: number | null;
  stripe_price_id: string | null;
  is_addon: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface HotelSubscription {
  id: string;
  property_id: string;
  plan_code: string | null;
  status: SubscriptionStatus;
  ai_addon: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  grace_until: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyWithSubscription {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  subscription: HotelSubscription | null;
}

// ── Plan catalogue ───────────────────────────────────────────
export function usePlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      if (isDemoMode) return [];
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as SubscriptionPlan[];
    },
  });
}

// ── A single property's subscription (owner-facing) ──────────
export function useMySubscription(propertyId: string | null | undefined) {
  return useQuery({
    queryKey: ['my-subscription', propertyId],
    queryFn: async (): Promise<HotelSubscription | null> => {
      if (isDemoMode || !propertyId) return null;
      const { data, error } = await supabase
        .from('hotel_subscriptions')
        .select('*')
        .eq('property_id', propertyId)
        .maybeSingle();
      if (error) throw error;
      return (data as HotelSubscription) ?? null;
    },
    enabled: !!propertyId && !isDemoMode,
  });
}

// ── All hotels + subscriptions (platform admin) ──────────────
export function useAllHotels() {
  return useQuery({
    queryKey: ['admin-hotels'],
    queryFn: async (): Promise<PropertyWithSubscription[]> => {
      if (isDemoMode) return [];
      const { data: props, error } = await supabase
        .from('properties')
        .select('id, name, slug, is_active, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: subs } = await supabase.from('hotel_subscriptions').select('*');
      const byProp = new Map<string, HotelSubscription>();
      for (const s of (subs ?? []) as HotelSubscription[]) byProp.set(s.property_id, s);

      return (props ?? []).map((p) => ({
        ...(p as Omit<PropertyWithSubscription, 'subscription'>),
        subscription: byProp.get(p.id) ?? null,
      }));
    },
    enabled: !isDemoMode,
  });
}

// ── Mutations: checkout, portal, suspend ─────────────────────
export function useBillingActions() {
  const queryClient = useQueryClient();

  const startCheckout = useMutation({
    mutationFn: async (input: { property_id: string; plan_code: string; ai_addon?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', { body: input });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Could not start checkout'),
  });

  const openPortal = useMutation({
    mutationFn: async (propertyId: string) => {
      const { data, error } = await supabase.functions.invoke('billing-portal', { body: { property_id: propertyId } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Could not open billing portal'),
  });

  const setPropertyActive = useMutation({
    mutationFn: async (input: { property_id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('properties')
        .update({ is_active: input.is_active })
        .eq('id', input.property_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-hotels'] });
      toast.success(vars.is_active ? 'Hotel reactivated' : 'Hotel suspended');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Action failed'),
  });

  return { startCheckout, openPortal, setPropertyActive };
}

// ── Helpers ──────────────────────────────────────────────────
export function formatGBP(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(pence / 100);
}

export function statusMeta(status: SubscriptionStatus | undefined): { label: string; color: string } {
  switch (status) {
    case 'active': return { label: 'Active', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
    case 'trialing': return { label: 'Trial', color: 'text-teal bg-teal/10 border-teal/20' };
    case 'past_due': return { label: 'Past due', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
    case 'canceled': return { label: 'Cancelled', color: 'text-red-400 bg-red-400/10 border-red-400/20' };
    case 'suspended': return { label: 'Suspended', color: 'text-red-400 bg-red-400/10 border-red-400/20' };
    case 'incomplete': return { label: 'Incomplete', color: 'text-steel bg-white/[0.04] border-white/[0.08]' };
    default: return { label: 'No plan', color: 'text-steel bg-white/[0.04] border-white/[0.08]' };
  }
}

/** Is the dashboard locked for this subscription state (past grace / cancelled / suspended)? */
export function isLocked(sub: HotelSubscription | null | undefined): boolean {
  if (!sub) return false;
  if (sub.status === 'suspended' || sub.status === 'canceled') return true;
  if (sub.status === 'past_due') {
    if (!sub.grace_until) return false;
    return new Date(sub.grace_until).getTime() < Date.now();
  }
  return false;
}
