import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { GuestRequest } from '@/types';
import toast from 'react-hot-toast';
import { subDays, subHours, subMinutes } from 'date-fns';

// ============================================================
// Demo Data
// ============================================================

const today = new Date();

const demoRequests: GuestRequest[] = [
  {
    id: 'req1',
    property_id: 'demo-property-id',
    booking_id: '4',
    guest_id: 'g4',
    room_id: 'r2',
    category: 'amenity',
    description: 'Extra towels and bathrobes requested',
    status: 'completed',
    priority: 'low',
    assigned_to: 'Housekeeping',
    completed_at: subHours(today, 2).toISOString(),
    notes: 'Delivered 2 extra bath towels and 1 bathrobe',
    created_at: subHours(today, 3).toISOString(),
    updated_at: subHours(today, 2).toISOString(),
  },
  {
    id: 'req2',
    property_id: 'demo-property-id',
    booking_id: '3',
    guest_id: 'g3',
    room_id: 'r5',
    category: 'dining',
    description: 'Table for 2 at restaurant tonight, 7:30pm — anniversary dinner',
    status: 'in_progress',
    priority: 'medium',
    assigned_to: 'Restaurant — Ben',
    completed_at: null,
    notes: 'Window table reserved. Champagne arranged.',
    created_at: subHours(today, 5).toISOString(),
    updated_at: subHours(today, 1).toISOString(),
  },
  {
    id: 'req3',
    property_id: 'demo-property-id',
    booking_id: '9',
    guest_id: 'g9',
    room_id: 'r7',
    category: 'wake_up',
    description: 'Wake-up call at 6:00am tomorrow',
    status: 'pending',
    priority: 'medium',
    assigned_to: 'Front Desk',
    completed_at: null,
    notes: null,
    created_at: subMinutes(today, 30).toISOString(),
    updated_at: subMinutes(today, 30).toISOString(),
  },
  {
    id: 'req4',
    property_id: 'demo-property-id',
    booking_id: '10',
    guest_id: 'g10',
    room_id: 'r10',
    category: 'transport',
    description: 'Taxi to airport needed at 10am checkout day',
    status: 'pending',
    priority: 'low',
    assigned_to: null,
    completed_at: null,
    notes: 'Flight at 1pm from Bristol Airport',
    created_at: subDays(today, 1).toISOString(),
    updated_at: subDays(today, 1).toISOString(),
  },
  {
    id: 'req5',
    property_id: 'demo-property-id',
    booking_id: '4',
    guest_id: 'g4',
    room_id: 'r2',
    category: 'complaint',
    description: 'Noise from room above — asked for room move or resolution',
    status: 'in_progress',
    priority: 'high',
    assigned_to: 'Duty Manager',
    completed_at: null,
    notes: 'Contacted room above. Monitoring situation.',
    created_at: subHours(today, 1).toISOString(),
    updated_at: subMinutes(today, 20).toISOString(),
  },
  {
    id: 'req6',
    property_id: 'demo-property-id',
    booking_id: '3',
    guest_id: 'g3',
    room_id: 'r5',
    category: 'information',
    description: 'Recommend local restaurants for lunch tomorrow',
    status: 'completed',
    priority: 'low',
    assigned_to: 'Concierge',
    completed_at: subHours(today, 6).toISOString(),
    notes: 'Recommended The Harbour Kitchen and Pier 21. Printed directions.',
    created_at: subHours(today, 7).toISOString(),
    updated_at: subHours(today, 6).toISOString(),
  },
];

// ============================================================
// Hook
// ============================================================

export function useGuestRequests() {
  const { property } = useProperty();
  const propertyId = property?.id ?? 'demo-property-id';
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['guestRequests', propertyId],
    queryFn: async () => {
      if (isDemoMode) return demoRequests;
      return [] as GuestRequest[];
    },
  });

  const createRequest = useMutation({
    mutationFn: async (input: Omit<GuestRequest, 'id' | 'property_id' | 'created_at' | 'updated_at'>) => {
      const newReq: GuestRequest = {
        ...input,
        id: `req-${Date.now()}`,
        property_id: propertyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (isDemoMode) {
        queryClient.setQueryData<GuestRequest[]>(['guestRequests', propertyId], old => [...(old ?? []), newReq]);
      }
      return newReq;
    },
    onSuccess: () => toast.success('Request created'),
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GuestRequest> & { id: string }) => {
      if (isDemoMode) {
        queryClient.setQueryData<GuestRequest[]>(['guestRequests', propertyId], old =>
          (old ?? []).map(r => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r)
        );
      }
      return id;
    },
    onSuccess: () => toast.success('Request updated'),
  });

  return { requests, isLoading, createRequest, updateRequest };
}
