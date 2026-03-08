import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { Booking, CreateBookingInput, Guest, BookingStatus, Room, FolioEntry, ActivityAction } from '@/types';
import { getAllDemoBookings, getDemoRoomTypesMap } from './demoData';
import { logActivity } from './useActivityLog';
import toast from 'react-hot-toast';

// Re-export for useFolios and other consumers
export { getHistoricalBookings } from './demoData';

// ============================================================
// Hook
// ============================================================

let nextDemoId = 100;

export function useBookings() {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();

  // Fetch all bookings
  const bookingsQuery = useQuery({
    queryKey: ['bookings', propertyId],
    queryFn: async (): Promise<Booking[]> => {
      if (isDemoMode) return getAllDemoBookings(propertyId!);

      const { data, error } = await supabase
        .from('bookings')
        .select('*, guest:guests(*), room_type:room_types(*), room:rooms(*)')
        .eq('property_id', propertyId!)
        .order('check_in', { ascending: true });

      if (error) throw error;
      return (data as Booking[]) ?? [];
    },
    enabled: !!propertyId,
  });

  // Fetch single booking
  const useBooking = (bookingId: string | undefined) =>
    useQuery({
      queryKey: ['booking', bookingId],
      queryFn: async (): Promise<Booking | null> => {
        if (isDemoMode) {
          const all = queryClient.getQueryData<Booking[]>(['bookings', propertyId]) ?? getAllDemoBookings(propertyId!);
          return all.find((b) => b.id === bookingId) ?? null;
        }

        const { data, error } = await supabase
          .from('bookings')
          .select('*, guest:guests(*), room_type:room_types(*), room:rooms(*)')
          .eq('id', bookingId!)
          .single();

        if (error) throw error;
        return data as Booking;
      },
      enabled: !!bookingId,
    });

  // Create booking — updates query cache in demo mode
  const createBooking = useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      if (isDemoMode) {
        const id = String(++nextDemoId);
        const nights = Math.ceil(
          (new Date(input.check_out).getTime() - new Date(input.check_in).getTime()) / 86400000
        );

        const propRoomTypes = getDemoRoomTypesMap(propertyId!);
        const rt = (propRoomTypes[input.room_type_id] ?? Object.values(propRoomTypes)[0])!;
        const rate = input.nightly_rate ?? rt.base_rate;

        // Auto-assign a room if none was explicitly provided
        let assignedRoomId = input.room_id ?? null;
        if (!assignedRoomId) {
          const allRooms = queryClient.getQueryData<Room[]>(['rooms', propertyId]) ?? [];
          const allBookings = queryClient.getQueryData<Booking[]>(['bookings', propertyId]) ?? [];
          const typeRooms = allRooms.filter(r => r.room_type_id === input.room_type_id && r.status !== 'maintenance' && r.status !== 'blocked');
          const qIn = new Date(input.check_in);
          const qOut = new Date(input.check_out);
          // Find room IDs blocked by overlapping bookings
          const blockedRoomIds = new Set<string>();
          allBookings.forEach(b => {
            if (!b.room_id || b.status === 'cancelled' || b.status === 'no_show' || b.status === 'checked_out') return;
            const ci = new Date(b.check_in);
            const co = new Date(b.check_out);
            if (ci < qOut && co > qIn) blockedRoomIds.add(b.room_id);
          });
          const availableRoom = typeRooms.find(r => !blockedRoomIds.has(r.id));
          if (availableRoom) {
            assignedRoomId = availableRoom.id;
            // Mark room as reserved
            queryClient.setQueryData<Room[]>(['rooms', propertyId], (old) =>
              (old ?? []).map(r => r.id === availableRoom.id ? { ...r, status: 'reserved' as const, updated_at: new Date().toISOString() } : r)
            );
          }
        }

        const newGuest: Guest = {
          id: `g-${id}`, property_id: propertyId!,
          first_name: input.guest.first_name, last_name: input.guest.last_name,
          email: input.guest.email || null, phone: input.guest.phone || null,
          nationality: null, preferences: {}, total_stays: 0, total_spend: 0, tags: [],
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };

        const newBooking: Booking = {
          id, property_id: propertyId!, guest_id: newGuest.id,
          room_type_id: input.room_type_id, room_id: assignedRoomId,
          confirmation_code: `AR-${Date.now().toString(36).toUpperCase().slice(-6)}`,
          check_in: input.check_in, check_out: input.check_out,
          num_guests: input.num_guests, status: 'confirmed',
          source: input.source ?? 'direct', nightly_rate: rate,
          total_amount: rate * nights, deposit_amount: 0, amount_paid: 0,
          stripe_payment_id: null, special_requests: input.special_requests ?? null,
          internal_notes: null, cancelled_at: null, cancellation_reason: null,
          checked_in_at: null, checked_out_at: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          guest: newGuest, room_type: rt,
        };

        queryClient.setQueryData<Booking[]>(['bookings', propertyId], (old) => [newBooking, ...(old ?? [])]);
        queryClient.setQueryData<Guest[]>(['guests', propertyId], (old) => [newGuest, ...(old ?? [])]);

        // Auto-post room charges to folio (no payment — guest pays at check-in)
        const roomCharge: FolioEntry = {
          id: `f-${id}-1`,
          booking_id: id,
          type: 'charge',
          category: 'room',
          description: `Room Charge — ${rt.name} × ${nights} night${nights !== 1 ? 's' : ''}`,
          amount: rate * nights,
          quantity: nights,
          unit_price: rate,
          posted_by: 'System',
          posted_at: new Date().toISOString(),
          is_voided: false,
        };
        queryClient.setQueryData<FolioEntry[]>(['folio', id], [roomCharge]);

        logActivity(queryClient, propertyId, {
          action: 'booking_created', entity_type: 'booking', entity_id: id,
          description: `New booking ${newBooking.confirmation_code} created — ${newGuest.first_name} ${newGuest.last_name}, ${rt.name}, ${nights} night${nights !== 1 ? 's' : ''}`,
          performed_by: 'Reception',
        });

        toast.success(`Booking ${newBooking.confirmation_code} created`);
        return newBooking;
      }

      // Find or create guest (manual select-then-insert to avoid PostgREST ON CONFLICT limitations)
      let guest: Guest;
      const guestEmail = input.guest.email?.trim() || null;

      if (guestEmail) {
        // Check if guest already exists for this property
        const { data: existing } = await supabase
          .from('guests')
          .select()
          .eq('property_id', input.property_id)
          .eq('email', guestEmail)
          .maybeSingle();

        if (existing) {
          // Update existing guest details
          const { data, error: guestError } = await supabase
            .from('guests')
            .update({
              first_name: input.guest.first_name,
              last_name: input.guest.last_name,
              phone: input.guest.phone ?? null,
            })
            .eq('id', existing.id)
            .select().single();
          if (guestError) throw guestError;
          guest = data as Guest;
        } else {
          // Insert new guest
          const { data, error: guestError } = await supabase
            .from('guests')
            .insert({
              property_id: input.property_id, first_name: input.guest.first_name,
              last_name: input.guest.last_name, email: guestEmail,
              phone: input.guest.phone ?? null,
            })
            .select().single();
          if (guestError) throw guestError;
          guest = data as Guest;
        }
      } else {
        // No email — always insert a new guest (walk-in / phone)
        const { data, error: guestError } = await supabase
          .from('guests')
          .insert({
            property_id: input.property_id, first_name: input.guest.first_name,
            last_name: input.guest.last_name, email: null,
            phone: input.guest.phone ?? null,
          })
          .select().single();
        if (guestError) throw guestError;
        guest = data as Guest;
      }

      const nights = Math.ceil(
        (new Date(input.check_out).getTime() - new Date(input.check_in).getTime()) / 86400000
      );
      const { data: roomType } = await supabase.from('room_types').select('base_rate').eq('id', input.room_type_id).single();
      const rate = input.nightly_rate ?? roomType?.base_rate ?? 0;

      const { data: inserted, error } = await supabase.from('bookings').insert({
        property_id: input.property_id, guest_id: guest.id, room_type_id: input.room_type_id,
        check_in: input.check_in, check_out: input.check_out, num_guests: input.num_guests,
        source: input.source ?? 'direct', special_requests: input.special_requests ?? null,
        nightly_rate: rate, total_amount: rate * nights, status: 'confirmed',
        confirmation_code: `AR-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      }).select().single();

      if (error) throw error;

      // Auto-post room charges to folio
      const rtName = (await supabase.from('room_types').select('name').eq('id', input.room_type_id).single()).data?.name ?? 'Room';
      const { error: folioError } = await supabase.from('folio_entries').insert({
        booking_id: inserted.id,
        type: 'charge',
        category: 'room',
        description: `Room Charge — ${rtName} × ${nights} night${nights !== 1 ? 's' : ''}`,
        amount: rate * nights,
        quantity: nights,
        unit_price: rate,
        posted_by: 'System',
        posted_at: new Date().toISOString(),
        is_voided: false,
      });
      if (folioError) {
        console.error('[Arrivé] Failed to post room charges to folio:', folioError);
        toast.error('Booking created but room charges could not be posted to folio');
      }

      // Ensure folio cache is fresh
      queryClient.invalidateQueries({ queryKey: ['folio', inserted.id] });

      toast.success('Booking created successfully');
      return inserted as Booking;
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['bookings'] }); },
    onError: (err: Error) => { toast.error(err.message ?? 'Failed to create booking'); },
  });

  // Update booking status — cascades room status + housekeeping automatically
  const updateStatus = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: BookingStatus }) => {
      // Find the booking so we know which room to cascade
      const allBookings = queryClient.getQueryData<Booking[]>(['bookings', propertyId]) ?? [];
      const booking = allBookings.find(b => b.id === bookingId);

      if (isDemoMode) {
        // 1) Update booking
        queryClient.setQueryData<Booking[]>(['bookings', propertyId], (old) =>
          (old ?? []).map((b) => {
            if (b.id !== bookingId) return b;
            const updates: Partial<Booking> = { status: status as BookingStatus };
            if (status === 'checked_in') updates.checked_in_at = new Date().toISOString();
            if (status === 'checked_out') { updates.checked_out_at = new Date().toISOString(); updates.room_id = null; }
            if (status === 'cancelled') { updates.cancelled_at = new Date().toISOString(); updates.room_id = null; }
            if (status === 'no_show') { updates.room_id = null; }
            return { ...b, ...updates, updated_at: new Date().toISOString() };
          })
        );

        // 2) Cascade to room
        if (booking?.room_id) {
          queryClient.setQueryData<Room[]>(['rooms', propertyId], (old) =>
            (old ?? []).map((r) => {
              if (r.id !== booking.room_id) return r;
              const now = new Date().toISOString();

              if (status === 'checked_in') {
                // Guest arriving → room occupied, housekeeping serviced
                return { ...r, status: 'occupied' as const, housekeeping_status: 'serviced' as const, updated_at: now };
              }
              if (status === 'checked_out') {
                // Guest departing → room available, housekeeping dirty (needs cleaning)
                return { ...r, status: 'available' as const, housekeeping_status: 'dirty' as const, notes: 'Departed — needs cleaning', updated_at: now };
              }
              if (status === 'cancelled' || status === 'no_show') {
                // Booking cancelled/no-show → free the room
                return { ...r, status: 'available' as const, updated_at: now };
              }
              return r;
            })
          );
        }

        // 3) Revoke key cards on checkout / cancellation / no-show
        if (status === 'checked_out' || status === 'cancelled' || status === 'no_show') {
          const existingKeys = queryClient.getQueryData<{ id: string; status: string }[]>(['keycards', bookingId]);
          if (existingKeys?.length) {
            queryClient.setQueryData(['keycards', bookingId], existingKeys.map(k =>
              k.status === 'active'
                ? { ...k, status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: 'System (auto)' }
                : k
            ));
          }
        }

        const labels: Record<string, string> = {
          checked_in: 'Guest checked in',
          checked_out: 'Guest checked out — room marked dirty',
          cancelled: 'Booking cancelled',
          no_show: 'Marked as no-show',
          confirmed: 'Booking confirmed',
        };

        const actionMap: Record<string, ActivityAction> = {
          checked_in: 'booking_checked_in',
          checked_out: 'booking_checked_out',
          cancelled: 'booking_cancelled',
          no_show: 'booking_no_show',
          confirmed: 'booking_confirmed',
        };
        const guestName = booking ? `${booking.guest?.first_name ?? ''} ${booking.guest?.last_name ?? ''}`.trim() : `Booking #${bookingId}`;
        logActivity(queryClient, propertyId, {
          action: actionMap[status] ?? 'booking_modified',
          entity_type: 'booking',
          entity_id: bookingId,
          description: `${labels[status] ?? status} — ${guestName}`,
          performed_by: 'Reception',
        });

        toast.success(labels[status] ?? `Booking ${status.replace('_', ' ')}`);
        return;
      }

      // Real mode
      const updates: Record<string, unknown> = { status };
      if (status === 'checked_in') updates.checked_in_at = new Date().toISOString();
      if (status === 'checked_out') { updates.checked_out_at = new Date().toISOString(); updates.room_id = null; }
      if (status === 'cancelled') { updates.cancelled_at = new Date().toISOString(); updates.room_id = null; }
      if (status === 'no_show') { updates.room_id = null; }

      const { error } = await supabase.from('bookings').update(updates).eq('id', bookingId);
      if (error) throw error;

      // Cascade to room in real mode too
      if (booking?.room_id) {
        if (status === 'checked_in') {
          await supabase.from('rooms').update({ status: 'occupied', housekeeping_status: 'serviced' }).eq('id', booking.room_id);
        } else if (status === 'checked_out') {
          await supabase.from('rooms').update({ status: 'available', housekeeping_status: 'dirty', notes: 'Departed — needs cleaning' }).eq('id', booking.room_id);
        } else if (status === 'cancelled' || status === 'no_show') {
          await supabase.from('rooms').update({ status: 'available' }).eq('id', booking.room_id);
        }
      }

      // Safety net: if checking in and folio is empty, auto-post room charges
      if (status === 'checked_in' && booking) {
        const { count } = await supabase.from('folio_entries').select('id', { count: 'exact', head: true }).eq('booking_id', bookingId);
        if (!count || count === 0) {
          const nights = Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000);
          const rate = booking.nightly_rate ?? 0;
          const { data: rt } = await supabase.from('room_types').select('name').eq('id', booking.room_type_id).single();
          const rtName = rt?.name ?? 'Room';
          const { error: folioErr } = await supabase.from('folio_entries').insert({
            booking_id: bookingId,
            type: 'charge',
            category: 'room',
            description: `Room Charge — ${rtName} × ${nights} night${nights !== 1 ? 's' : ''}`,
            amount: rate * nights,
            quantity: nights,
            unit_price: rate,
            posted_by: 'System',
            posted_at: new Date().toISOString(),
            is_voided: false,
          });
          if (folioErr) console.error('[Arrivé] Safety-net folio post failed:', folioErr);
        }
      }

      toast.success(`Booking ${status.replace('_', ' ')}`);
    },
    onSuccess: () => {
      if (!isDemoMode) {
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
        queryClient.invalidateQueries({ queryKey: ['folio'] });
      }
    },
    onError: (err: Error) => { toast.error(err.message ?? 'Failed to update status'); },
  });

  // Assign / move a booking to a different room — updates both bookings and rooms caches
  const assignRoom = useMutation({
    mutationFn: async ({ bookingId, newRoomId, oldRoomId, newRoomTypeId, newNightlyRate }: { bookingId: string; newRoomId: string; oldRoomId: string | null; newRoomTypeId?: string; newNightlyRate?: number }) => {
      if (isDemoMode) {
        // Update booking's room_id (and optionally room_type_id + nightly_rate for upgrades)
        queryClient.setQueryData<Booking[]>(['bookings', propertyId], (old) =>
          (old ?? []).map((b) => {
            if (b.id !== bookingId) return b;
            const updated = { ...b, room_id: newRoomId, updated_at: new Date().toISOString() };
            if (newRoomTypeId) updated.room_type_id = newRoomTypeId;
            if (newNightlyRate != null) {
              updated.nightly_rate = newNightlyRate;
              const nights = Math.ceil((new Date(updated.check_out).getTime() - new Date(updated.check_in).getTime()) / 86400000);
              updated.total_amount = nights * newNightlyRate;
            }
            return updated;
          })
        );
        // Sync folio: update the accommodation charge to match the new rate
        if (newNightlyRate != null) {
          queryClient.setQueryData<FolioEntry[]>(['folio', bookingId], (old) =>
            (old ?? []).map((entry) => {
              if (entry.type !== 'charge' || entry.category !== 'room' || entry.is_voided) return entry;
              // Update per-night rate only — preserve the entry's own quantity
              return { ...entry, unit_price: newNightlyRate, amount: newNightlyRate * entry.quantity };
            })
          );
        }
        // Update rooms: free old room (if occupied), set new room status based on booking
        const bk = (queryClient.getQueryData<Booking[]>(['bookings', propertyId]) ?? []).find(b => b.id === bookingId);
        const newRoomStatus = bk && bk.status === 'checked_in' ? 'occupied' as const : 'reserved' as const;
        queryClient.setQueryData<Room[]>(['rooms', propertyId], (old) =>
          (old ?? []).map((r) => {
            const now = new Date().toISOString();
            if (r.id === oldRoomId) {
              // Only mark dirty if room was occupied (guest actually stayed)
              const wasOccupied = r.status === 'occupied';
              return { ...r, status: 'available' as const, housekeeping_status: wasOccupied ? 'dirty' as const : r.housekeeping_status, notes: wasOccupied ? 'Guest moved \u2014 needs cleaning' : r.notes, updated_at: now };
            }
            if (r.id === newRoomId) {
              return { ...r, status: newRoomStatus, updated_at: now };
            }
            return r;
          })
        );
        toast.success('Room assignment updated');
        return;
      }

      // Real mode: update booking and both rooms
      const bookingUpdate: Record<string, unknown> = { room_id: newRoomId };
      if (newRoomTypeId) bookingUpdate.room_type_id = newRoomTypeId;
      if (newNightlyRate != null) bookingUpdate.nightly_rate = newNightlyRate;
      const { error: bookingErr } = await supabase.from('bookings').update(bookingUpdate).eq('id', bookingId);
      if (bookingErr) throw bookingErr;
      if (oldRoomId) {
        await supabase.from('rooms').update({ status: 'available', housekeeping_status: 'dirty', notes: 'Guest moved — needs cleaning' }).eq('id', oldRoomId);
      }
      await supabase.from('rooms').update({ status: 'occupied' }).eq('id', newRoomId);
      toast.success('Room assignment updated');
    },
    onSuccess: () => {
      if (!isDemoMode) {
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
      }
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to assign room'),
  });

  // Modify booking dates / extend stay
  const modifyBooking = useMutation({
    mutationFn: async ({ bookingId, updates, guestUpdates }: {
      bookingId: string;
      updates?: Partial<Pick<Booking, 'check_in' | 'check_out' | 'num_guests' | 'special_requests' | 'internal_notes' | 'nightly_rate' | 'total_amount' | 'room_type_id' | 'source'>>;
      guestUpdates?: { first_name: string; last_name: string; email?: string; phone?: string };
    }) => {
      if (isDemoMode) {
        if (updates) {
          queryClient.setQueryData<Booking[]>(['bookings', propertyId], (old) =>
            (old ?? []).map((b) => {
              if (b.id !== bookingId) return b;
              const merged = { ...b, ...updates, updated_at: new Date().toISOString() };
              // Recalculate total if dates changed
              if (updates.check_out || updates.check_in) {
                const ci = updates.check_in ?? b.check_in;
                const co = updates.check_out ?? b.check_out;
                const nights = Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86400000);
                merged.total_amount = nights * merged.nightly_rate;
              }
              return merged;
            })
          );
          // Sync folio when rate changes
          if (updates.nightly_rate != null) {
            queryClient.setQueryData<FolioEntry[]>(['folio', bookingId], (old) =>
              (old ?? []).map((entry) => {
                if (entry.type !== 'charge' || entry.category !== 'room' || entry.is_voided) return entry;
                return { ...entry, unit_price: updates.nightly_rate!, amount: updates.nightly_rate! * entry.quantity };
              })
            );
          }
        }
        // Update guest on booking AND in guests cache
        if (guestUpdates) {
          const booking = (queryClient.getQueryData<Booking[]>(['bookings', propertyId]) ?? []).find(b => b.id === bookingId);
          if (booking?.guest_id) {
            const guestPatch = {
              first_name: guestUpdates.first_name,
              last_name: guestUpdates.last_name,
              email: guestUpdates.email || null,
              phone: guestUpdates.phone || null,
              updated_at: new Date().toISOString(),
            };
            // Update the embedded guest inside the booking
            queryClient.setQueryData<Booking[]>(['bookings', propertyId], (old) =>
              (old ?? []).map((b) => b.id !== bookingId ? b : { ...b, guest: b.guest ? { ...b.guest, ...guestPatch } : b.guest })
            );
            // Sync standalone guests cache
            queryClient.setQueryData<Guest[]>(['guests', propertyId], (old) =>
              (old ?? []).map((g) => g.id === booking.guest_id ? { ...g, ...guestPatch } : g)
            );
          }
        }
        toast.success('Booking updated');
        return;
      }
      if (updates) {
        const { error } = await supabase.from('bookings').update(updates).eq('id', bookingId);
        if (error) throw error;
      }
      if (guestUpdates) {
        const booking = (queryClient.getQueryData<Booking[]>(['bookings', propertyId]) ?? []).find(b => b.id === bookingId);
        if (booking?.guest_id) {
          const { error } = await supabase.from('guests').update({
            first_name: guestUpdates.first_name,
            last_name: guestUpdates.last_name,
            email: guestUpdates.email || null,
            phone: guestUpdates.phone || null,
          }).eq('id', booking.guest_id);
          if (error) throw error;
        }
      }
      toast.success('Booking updated');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['bookings'] }); },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to modify booking'),
  });

  return {
    bookings: bookingsQuery.data ?? [],
    isLoading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
    useBooking,
    createBooking,
    updateStatus,
    assignRoom,
    modifyBooking,
    refetch: bookingsQuery.refetch,
  };
}