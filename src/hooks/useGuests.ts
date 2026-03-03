import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { Guest } from '@/types';
import type { GuestFormData } from '@/lib/validators';
import toast from 'react-hot-toast';

// ============================================================
// Demo Data
// ============================================================

const today = new Date();

export const demoGuests: Guest[] = [
  // g1: Sarah Mitchell — B1 confirmed (arriving today). Historical: 2 past stays worth £1,113
  { id: 'g1', property_id: 'demo-property-id', first_name: 'Sarah', last_name: 'Mitchell', email: 'sarah@email.com', phone: '+44 7700 123456', nationality: 'British', preferences: { room_pref: 'High floor, quiet room' }, total_stays: 2, total_spend: 1113, tags: ['VIP'], created_at: new Date(today.getTime() - 90 * 86400000).toISOString(), updated_at: today.toISOString() },
  // g2: James O'Brien — B2 confirmed (first stay, not yet completed)
  { id: 'g2', property_id: 'demo-property-id', first_name: 'James', last_name: "O'Brien", email: 'james@email.com', phone: '+44 7700 654321', nationality: 'Irish', preferences: {}, total_stays: 0, total_spend: 0, tags: [], created_at: new Date(today.getTime() - 14 * 86400000).toISOString(), updated_at: today.toISOString() },
  // g3: Maria Fernandez — B3 checked_in (departing today). 1 past stay worth £673
  { id: 'g3', property_id: 'demo-property-id', first_name: 'Maria', last_name: 'Fernandez', email: 'maria@email.com', phone: '+34 612 345678', nationality: 'Spanish', preferences: { dietary: 'Vegetarian' }, total_stays: 1, total_spend: 673, tags: ['Returning'], created_at: new Date(today.getTime() - 120 * 86400000).toISOString(), updated_at: today.toISOString() },
  // g4: David Chen — B4 checked_in (mid-stay). 4 past stays worth £2,066
  { id: 'g4', property_id: 'demo-property-id', first_name: 'David', last_name: 'Chen', email: 'david.chen@email.com', phone: '+44 7700 999888', nationality: 'British', preferences: {}, total_stays: 4, total_spend: 2066, tags: ['VIP', 'Returning'], created_at: new Date(today.getTime() - 365 * 86400000).toISOString(), updated_at: today.toISOString() },
  // g5: Emma Watson — B5 pending (never stayed)
  { id: 'g5', property_id: 'demo-property-id', first_name: 'Emma', last_name: 'Watson', email: 'emma.w@email.com', phone: '+44 7700 111222', nationality: 'British', preferences: {}, total_stays: 0, total_spend: 0, tags: [], created_at: new Date(today.getTime() - 2 * 86400000).toISOString(), updated_at: today.toISOString() },
  // g6: Hiroshi Tanaka — B6 confirmed (future, not yet stayed)
  { id: 'g6', property_id: 'demo-property-id', first_name: 'Hiroshi', last_name: 'Tanaka', email: 'hiroshi@email.com', phone: '+81 90 1234 5678', nationality: 'Japanese', preferences: { room_pref: 'High floor' }, total_stays: 0, total_spend: 0, tags: [], created_at: new Date(today.getTime() - 30 * 86400000).toISOString(), updated_at: today.toISOString() },
  // g7: Sophie Laurent — B7 confirmed (future). 3 past stays worth £1,734
  { id: 'g7', property_id: 'demo-property-id', first_name: 'Sophie', last_name: 'Laurent', email: 'sophie.l@email.com', phone: '+33 6 12 34 56 78', nationality: 'French', preferences: { dietary: 'Gluten-free' }, total_stays: 3, total_spend: 1734, tags: ['VIP', 'Returning'], created_at: new Date(today.getTime() - 200 * 86400000).toISOString(), updated_at: today.toISOString() },
  // g8: Oliver Wright — B8 checked_out (departed 3 days ago). 1 past stay worth £398
  { id: 'g8', property_id: 'demo-property-id', first_name: 'Oliver', last_name: 'Wright', email: 'oliver.wright@email.com', phone: '+44 7911 234567', nationality: 'British', preferences: { notes: 'Early riser' }, total_stays: 2, total_spend: 656, tags: ['Returning'], created_at: new Date(today.getTime() - 60 * 86400000).toISOString(), updated_at: today.toISOString() },
  // g9: Liam Murphy — B9 checked_in (departing today). First stay
  { id: 'g9', property_id: 'demo-property-id', first_name: 'Liam', last_name: 'Murphy', email: 'liam.murphy@email.com', phone: '+353 87 123 4567', nationality: 'Irish', preferences: { room_pref: 'Quiet room' }, total_stays: 0, total_spend: 0, tags: [], created_at: new Date(today.getTime() - 10 * 86400000).toISOString(), updated_at: today.toISOString() },
  // g10: Anna Kowalski — B10 checked_in (departing today). 2 past stays worth £853
  { id: 'g10', property_id: 'demo-property-id', first_name: 'Anna', last_name: 'Kowalski', email: 'anna.kowalski@email.com', phone: '+48 512 345 678', nationality: 'Polish', preferences: {}, total_stays: 2, total_spend: 853, tags: ['Returning'], created_at: new Date(today.getTime() - 90 * 86400000).toISOString(), updated_at: today.toISOString() },
];

// ============================================================
// Hook
// ============================================================

export function useGuests() {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();

  const guestsQuery = useQuery({
    queryKey: ['guests', propertyId],
    queryFn: async (): Promise<Guest[]> => {
      if (isDemoMode) return demoGuests;
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
          const all = queryClient.getQueryData<Guest[]>(['guests', propertyId]) ?? demoGuests;
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
          id, property_id: 'demo-property-id',
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
