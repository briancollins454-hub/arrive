import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useRooms } from '@/hooks/useRooms';
import { useProperty } from '@/hooks/useProperty';
import type { RatePeriod } from '@/types';
import toast from 'react-hot-toast';

// ============================================================
// Demo rate periods â€” seasonal pricing
// ============================================================

function buildDemoRates(roomTypes: { id: string; base_rate: number }[], propId: string): RatePeriod[] {
  const now = new Date().toISOString();
  return roomTypes.flatMap((rt) => [
    {
      id: `${rt.id}-standard`,
      property_id: propId,
      room_type_id: rt.id,
      name: 'Standard',
      start_date: '2025-01-01',
      end_date: '2025-06-30',
      rate: rt.base_rate,
      min_stay: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: `${rt.id}-summer`,
      property_id: propId,
      room_type_id: rt.id,
      name: 'Summer Peak',
      start_date: '2025-07-01',
      end_date: '2025-08-31',
      rate: Math.round(rt.base_rate * 1.35),
      min_stay: 2,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: `${rt.id}-autumn`,
      property_id: propId,
      room_type_id: rt.id,
      name: 'Autumn Shoulder',
      start_date: '2025-09-01',
      end_date: '2025-10-31',
      rate: Math.round(rt.base_rate * 1.1),
      min_stay: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: `${rt.id}-winter`,
      property_id: propId,
      room_type_id: rt.id,
      name: 'Winter Low',
      start_date: '2025-11-01',
      end_date: '2025-12-20',
      rate: Math.round(rt.base_rate * 0.8),
      min_stay: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: `${rt.id}-xmas`,
      property_id: propId,
      room_type_id: rt.id,
      name: 'Christmas & New Year',
      start_date: '2025-12-21',
      end_date: '2026-01-05',
      rate: Math.round(rt.base_rate * 1.5),
      min_stay: 3,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: `${rt.id}-q1-2026`,
      property_id: propId,
      room_type_id: rt.id,
      name: 'Q1 2026',
      start_date: '2026-01-06',
      end_date: '2026-03-31',
      rate: rt.base_rate,
      min_stay: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: `${rt.id}-spring-2026`,
      property_id: propId,
      room_type_id: rt.id,
      name: 'Spring 2026',
      start_date: '2026-04-01',
      end_date: '2026-06-30',
      rate: Math.round(rt.base_rate * 1.15),
      min_stay: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: `${rt.id}-summer-2026`,
      property_id: propId,
      room_type_id: rt.id,
      name: 'Summer 2026',
      start_date: '2026-07-01',
      end_date: '2026-08-31',
      rate: Math.round(rt.base_rate * 1.35),
      min_stay: 2,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]);
}

// ============================================================
// Hook
// ============================================================

export function useRatePeriods() {
  const queryClient = useQueryClient();
  const { roomTypes } = useRooms();
  const { propertyId } = useProperty();

  const ratesQuery = useQuery({
    queryKey: ['rate-periods', propertyId],
    queryFn: async () => {
      if (isDemoMode) return buildDemoRates(roomTypes, propertyId ?? 'demo-property-id');
      const { data, error } = await supabase
        .from('rate_periods')
        .select('*')
        .eq('property_id', propertyId)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data as RatePeriod[];
    },
    enabled: roomTypes.length > 0,
  });

  const createRate = useMutation({
    mutationFn: async (input: Omit<RatePeriod, 'id' | 'property_id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const newRate: RatePeriod = {
        id: `rp-${Date.now()}`,
        property_id: propertyId ?? 'demo-property-id',
        ...input,
        created_at: now,
        updated_at: now,
      };

      if (isDemoMode) {
        queryClient.setQueryData<RatePeriod[]>(['rate-periods', propertyId], (old) => [...(old ?? []), newRate]);
        return newRate;
      }

      const { data, error } = await supabase.from('rate_periods').insert(newRate).select().single();
      if (error) throw error;
      return data as RatePeriod;
    },
    onSuccess: () => {
      toast.success('Rate period created');
      if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['rate-periods'] });
    },
  });

  const updateRate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RatePeriod> & { id: string }) => {
      if (isDemoMode) {
        queryClient.setQueryData<RatePeriod[]>(['rate-periods', propertyId], (old) =>
          (old ?? []).map((rp) => rp.id === id ? { ...rp, ...updates, updated_at: new Date().toISOString() } : rp)
        );
        return;
      }
      const { error } = await supabase.from('rate_periods').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rate period updated');
      if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['rate-periods'] });
    },
  });

  const deleteRate = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        queryClient.setQueryData<RatePeriod[]>(['rate-periods', propertyId], (old) =>
          (old ?? []).filter((rp) => rp.id !== id)
        );
        return;
      }
      const { error } = await supabase.from('rate_periods').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rate period deleted');
      if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['rate-periods'] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (id: string) => {
      const existing = (ratesQuery.data ?? []).find((rp) => rp.id === id);
      if (!existing) return;
      if (isDemoMode) {
        queryClient.setQueryData<RatePeriod[]>(['rate-periods', propertyId], (old) =>
          (old ?? []).map((rp) => rp.id === id ? { ...rp, is_active: !rp.is_active, updated_at: new Date().toISOString() } : rp)
        );
        return;
      }
      const { error } = await supabase.from('rate_periods').update({ is_active: !existing.is_active, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['rate-periods'] });
    },
  });

  return {
    ratePeriods: ratesQuery.data ?? [],
    isLoading: ratesQuery.isLoading,
    createRate,
    updateRate,
    deleteRate,
    toggleActive,
  };
}
