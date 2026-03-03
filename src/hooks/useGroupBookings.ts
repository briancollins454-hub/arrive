import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { GroupBooking } from '@/types';
import toast from 'react-hot-toast';
import { format, addDays, subDays } from 'date-fns';

// ============================================================
// Demo Data
// ============================================================

const today = new Date();
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

const demoGroups: GroupBooking[] = [
  {
    id: 'grp1',
    property_id: 'demo-property-id',
    name: 'Henderson Wedding',
    organiser_name: 'Claire Henderson',
    organiser_email: 'claire.h@email.com',
    organiser_phone: '+44 7700 111333',
    status: 'definite',
    check_in: fmt(addDays(today, 14)),
    check_out: fmt(addDays(today, 16)),
    rooms_blocked: 5,
    rate_agreed: 159,
    cutoff_date: fmt(addDays(today, 7)),
    booking_ids: [],
    notes: 'Wedding party — bride & groom in Garden Suite. Block released after cutoff.',
    created_at: subDays(today, 30).toISOString(),
    updated_at: today.toISOString(),
  },
  {
    id: 'grp2',
    property_id: 'demo-property-id',
    name: 'Acme Corp Q1 Offsite',
    organiser_name: 'Tom Baker',
    organiser_email: 'tom.baker@acmecorp.com',
    organiser_phone: '+44 20 7946 0958',
    status: 'definite',
    check_in: fmt(addDays(today, 30)),
    check_out: fmt(addDays(today, 33)),
    rooms_blocked: 8,
    rate_agreed: 119,
    cutoff_date: fmt(addDays(today, 21)),
    booking_ids: [],
    notes: 'Corporate rate. Invoice to Acme Corp accounts dept. Meeting room needed.',
    created_at: subDays(today, 10).toISOString(),
    updated_at: today.toISOString(),
  },
  {
    id: 'grp3',
    property_id: 'demo-property-id',
    name: 'Cycling Club Tour',
    organiser_name: 'Pete Williams',
    organiser_email: 'pete@cycleclub.org',
    organiser_phone: '+44 7911 555666',
    status: 'definite',
    check_in: fmt(addDays(today, 5)),
    check_out: fmt(addDays(today, 7)),
    rooms_blocked: 4,
    rate_agreed: 109,
    cutoff_date: fmt(addDays(today, 2)),
    booking_ids: [],
    notes: 'Secure bike storage needed. Early breakfast at 6:30am.',
    created_at: subDays(today, 20).toISOString(),
    updated_at: today.toISOString(),
  },
];

// ============================================================
// Hook
// ============================================================

export function useGroupBookings() {
  const { property } = useProperty();
  const propertyId = property?.id ?? 'demo-property-id';
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups', propertyId],
    queryFn: async () => {
      if (isDemoMode) return demoGroups;
      return [] as GroupBooking[];
    },
  });

  const createGroup = useMutation({
    mutationFn: async (input: Omit<GroupBooking, 'id' | 'property_id' | 'created_at' | 'updated_at'>) => {
      const newGroup: GroupBooking = {
        ...input,
        id: `grp-${Date.now()}`,
        property_id: propertyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (isDemoMode) {
        queryClient.setQueryData<GroupBooking[]>(['groups', propertyId], old => [...(old ?? []), newGroup]);
      }
      return newGroup;
    },
    onSuccess: () => toast.success('Group booking created'),
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GroupBooking> & { id: string }) => {
      if (isDemoMode) {
        queryClient.setQueryData<GroupBooking[]>(['groups', propertyId], old =>
          (old ?? []).map(g => g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g)
        );
      }
      return id;
    },
    onSuccess: () => toast.success('Group updated'),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        queryClient.setQueryData<GroupBooking[]>(['groups', propertyId], old =>
          (old ?? []).filter(g => g.id !== id)
        );
      }
    },
    onSuccess: () => toast.success('Group deleted'),
  });

  return { groups, isLoading, createGroup, updateGroup, deleteGroup };
}
