import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { LostFoundItem } from '@/types';
import toast from 'react-hot-toast';
import { subDays, subHours } from 'date-fns';

// ============================================================
// Demo Data
// ============================================================

const today = new Date();

const demoItems: LostFoundItem[] = [
  {
    id: 'lf1',
    property_id: 'demo-property-id',
    room_id: 'r2',
    guest_id: null,
    description: 'Black leather wallet with bank cards — Capital One and Barclays',
    found_location: 'Room 202, bedside drawer',
    found_by: 'Housekeeping — Maria',
    status: 'found',
    claimed_by: null,
    claimed_at: null,
    notes: 'Guest contacted by email — awaiting response',
    created_at: subDays(today, 1).toISOString(),
    updated_at: subDays(today, 1).toISOString(),
  },
  {
    id: 'lf2',
    property_id: 'demo-property-id',
    room_id: 'r5',
    guest_id: 'g3',
    description: 'Silver earrings, small hoops',
    found_location: 'Room 302, bathroom counter',
    found_by: 'Housekeeping — Tom',
    status: 'claimed',
    claimed_by: 'Maria Fernandez',
    claimed_at: subHours(today, 4).toISOString(),
    notes: 'Guest collected at reception',
    created_at: subDays(today, 3).toISOString(),
    updated_at: subHours(today, 4).toISOString(),
  },
  {
    id: 'lf3',
    property_id: 'demo-property-id',
    room_id: null,
    guest_id: null,
    description: 'Blue umbrella, compact folding type',
    found_location: 'Restaurant, table 4',
    found_by: 'Restaurant staff — Ben',
    status: 'found',
    claimed_by: null,
    claimed_at: null,
    notes: null,
    created_at: subDays(today, 7).toISOString(),
    updated_at: subDays(today, 7).toISOString(),
  },
  {
    id: 'lf4',
    property_id: 'demo-property-id',
    room_id: 'r3',
    guest_id: null,
    description: 'Apple iPhone charger cable (Lightning)',
    found_location: 'Room 105, under the desk',
    found_by: 'Housekeeping — Maria',
    status: 'disposed',
    claimed_by: null,
    claimed_at: null,
    notes: 'Held for 30 days, no claim — disposed',
    created_at: subDays(today, 45).toISOString(),
    updated_at: subDays(today, 15).toISOString(),
  },
  {
    id: 'lf5',
    property_id: 'demo-property-id',
    room_id: 'r7',
    guest_id: 'g6',
    description: 'Prescription sunglasses in hard case — Ray-Ban',
    found_location: 'Room 204, on wardrobe shelf',
    found_by: 'Housekeeping — Tom',
    status: 'shipped',
    claimed_by: 'Hiroshi Tanaka',
    claimed_at: subDays(today, 5).toISOString(),
    notes: 'Shipped via Royal Mail Tracked to Japan address on file',
    created_at: subDays(today, 10).toISOString(),
    updated_at: subDays(today, 5).toISOString(),
  },
];

// ============================================================
// Hook
// ============================================================

export function useLostFound() {
  const { property } = useProperty();
  const propertyId = property?.id ?? 'demo-property-id';
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['lostFound', propertyId],
    queryFn: async () => {
      if (isDemoMode) return demoItems;
      return [] as LostFoundItem[];
    },
  });

  const createItem = useMutation({
    mutationFn: async (input: Omit<LostFoundItem, 'id' | 'property_id' | 'created_at' | 'updated_at'>) => {
      const newItem: LostFoundItem = {
        ...input,
        id: `lf-${Date.now()}`,
        property_id: propertyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (isDemoMode) {
        queryClient.setQueryData<LostFoundItem[]>(['lostFound', propertyId], old => [...(old ?? []), newItem]);
      }
      return newItem;
    },
    onSuccess: () => toast.success('Item logged'),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LostFoundItem> & { id: string }) => {
      if (isDemoMode) {
        queryClient.setQueryData<LostFoundItem[]>(['lostFound', propertyId], old =>
          (old ?? []).map(i => i.id === id ? { ...i, ...updates, updated_at: new Date().toISOString() } : i)
        );
      }
      return id;
    },
    onSuccess: () => toast.success('Item updated'),
  });

  return { items, isLoading, createItem, updateItem };
}
