import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import { getDemoGuests } from './demoData';
import type { Guest } from '@/types';
import type { GuestFormData } from '@/lib/validators';
import toast from 'react-hot-toast';

// ============================================================
// Hook
// ============================================================

export function useGuests() {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();

  const guestsQuery = useQuery({
    queryKey: ['guests', propertyId],
    queryFn: async (): Promise<Guest[]> => {
      if (isDemoMode) return getDemoGuests(propertyId!);
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('property_id', propertyId!)
        .order('last_name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId,
  });

  const useGuest = (guestId: string | undefined) =>
    useQuery({
      queryKey: ['guest', guestId],
      queryFn: async (): Promise<Guest | null> => {
        if (isDemoMode) {
          const all = queryClient.getQueryData<Guest[]>(['guests', propertyId]) ?? getDemoGuests(propertyId!);
          return all.find((g) => g.id === guestId) ?? null;
        }
        const { data, error } = await supabase
          .from('guests')
          .select('*')
          .eq('id', guestId!)
          .single();
        if (error) throw error;
        return data;
      },
      enabled: !!guestId,
    });

  const createGuest = useMutation({
    mutationFn: async (input: GuestFormData) => {
      if (isDemoMode) {
        const id = `g-${Date.now()}`;
        const newGuest: Guest = {
          id, property_id: propertyId!,
          first_name: input.first_name, last_name: input.last_name,
          email: input.email || null, phone: input.phone || null,
          nationality: input.nationality || null, preferences: {},
          total_stays: 0, total_spend: 0, tags: [],
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<Guest[]>(['guests', propertyId], (old) => [newGuest, ...(old ?? [])]);
        toast.success('Guest created');
        return;
      }
      const { error } = await supabase.from('guests').insert({
        ...input,
        property_id: propertyId!,
        email: input.email || null,
        phone: input.phone || null,
        nationality: input.nationality || null,
      });
      if (error) throw error;
      toast.success('Guest created');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['guests'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateGuest = useMutation({
    mutationFn: async ({ id, ...input }: GuestFormData & { id: string }) => {
      if (isDemoMode) {
        queryClient.setQueryData<Guest[]>(['guests', propertyId], (old) =>
          (old ?? []).map((g) => g.id === id ? {
            ...g, ...input,
            email: input.email || null, phone: input.phone || null,
            nationality: input.nationality || null,
            updated_at: new Date().toISOString(),
          } : g)
        );
        toast.success('Guest updated');
        return;
      }
      const { error } = await supabase.from('guests').update({
        ...input,
        email: input.email || null,
        phone: input.phone || null,
        nationality: input.nationality || null,
      }).eq('id', id);
      if (error) throw error;
      toast.success('Guest updated');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['guests'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    guests: guestsQuery.data ?? [],
    isLoading: guestsQuery.isLoading,
    useGuest,
    createGuest,
    updateGuest,
  };
}
