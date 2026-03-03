import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import type { Booking, CreateBookingInput, Guest, BookingStatus, Room, FolioEntry, ActivityAction } from '@/types';
import { demoGuests } from './useGuests';
import { demoRoomTypes as demoRoomTypesArray } from './useRooms';
import { logActivity } from './useActivityLog';
import toast from 'react-hot-toast';
import { format, addDays, subDays, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

// ============================================================
// Demo Data — rich, realistic bookings
// ============================================================

const today = new Date();
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

const demoRoomTypes = Object.fromEntries(demoRoomTypesArray.map(rt => [rt.id, rt])) as Record<string, typeof demoRoomTypesArray[0]>;

const demoBookings: Booking[] = [
  { id: '1', property_id: 'demo-property-id', guest_id: 'g1', room_type_id: 'rt1', room_id: 'r1', confirmation_code: 'AR-TK82NP', check_in: fmt(today), check_out: fmt(addDays(today, 3)), num_guests: 2, status: 'confirmed', source: 'direct', nightly_rate: 189, total_amount: 567, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: 'Late check-in please (arriving after 9pm)', internal_notes: 'VIP guest — complimentary upgrade if available', cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: subDays(today, 7).toISOString(), updated_at: today.toISOString(), guest: demoGuests[0], room_type: demoRoomTypes.rt1 },
  { id: '2', property_id: 'demo-property-id', guest_id: 'g2', room_type_id: 'rt2', room_id: 'r3', confirmation_code: 'AR-JW93KE', check_in: fmt(today), check_out: fmt(addDays(today, 2)), num_guests: 1, status: 'confirmed', source: 'booking_com', nightly_rate: 129, total_amount: 258, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: null, internal_notes: 'Called to confirm parking', cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: subDays(today, 3).toISOString(), updated_at: today.toISOString(), guest: demoGuests[1], room_type: demoRoomTypes.rt2 },
  { id: '3', property_id: 'demo-property-id', guest_id: 'g3', room_type_id: 'rt3', room_id: 'r5', confirmation_code: 'AR-MF47RL', check_in: fmt(subDays(today, 3)), check_out: fmt(today), num_guests: 2, status: 'checked_in', source: 'direct', nightly_rate: 289, total_amount: 867, deposit_amount: 0, amount_paid: 985.30, stripe_payment_id: null, special_requests: 'Extra pillows please', internal_notes: 'Celebrating anniversary — champagne arranged', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 3).toISOString(), checked_out_at: null, created_at: subDays(today, 14).toISOString(), updated_at: today.toISOString(), guest: demoGuests[2], room_type: demoRoomTypes.rt3 },
  { id: '4', property_id: 'demo-property-id', guest_id: 'g4', room_type_id: 'rt1', room_id: 'r2', confirmation_code: 'AR-DC56WM', check_in: fmt(subDays(today, 1)), check_out: fmt(addDays(today, 5)), num_guests: 2, status: 'checked_in', source: 'direct', nightly_rate: 189, total_amount: 1134, deposit_amount: 0, amount_paid: 1134, stripe_payment_id: null, special_requests: null, internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 1).toISOString(), checked_out_at: null, created_at: subDays(today, 21).toISOString(), updated_at: today.toISOString(), guest: demoGuests[3], room_type: demoRoomTypes.rt1 },
  { id: '5', property_id: 'demo-property-id', guest_id: 'g5', room_type_id: 'rt1', room_id: 'r9', confirmation_code: 'AR-EW28XG', check_in: fmt(addDays(today, 1)), check_out: fmt(addDays(today, 3)), num_guests: 1, status: 'pending', source: 'expedia', nightly_rate: 189, total_amount: 378, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: 'Ground floor if possible', internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: subDays(today, 1).toISOString(), updated_at: today.toISOString(), guest: demoGuests[4], room_type: demoRoomTypes.rt1 },
  { id: '6', property_id: 'demo-property-id', guest_id: 'g6', room_type_id: 'rt4', room_id: 'r7', confirmation_code: 'AR-HT61QP', check_in: fmt(addDays(today, 2)), check_out: fmt(addDays(today, 5)), num_guests: 2, status: 'confirmed', source: 'direct', nightly_rate: 219, total_amount: 657, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: 'Japanese tea if available', internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: subDays(today, 10).toISOString(), updated_at: today.toISOString(), guest: demoGuests[5], room_type: demoRoomTypes.rt4 },
  { id: '7', property_id: 'demo-property-id', guest_id: 'g7', room_type_id: 'rt3', room_id: 'r6', confirmation_code: 'AR-SL74FB', check_in: fmt(addDays(today, 4)), check_out: fmt(addDays(today, 8)), num_guests: 2, status: 'confirmed', source: 'airbnb', nightly_rate: 289, total_amount: 1156, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: 'Gluten-free breakfast options', internal_notes: 'Repeat guest — 4th stay', cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: subDays(today, 30).toISOString(), updated_at: today.toISOString(), guest: demoGuests[6], room_type: demoRoomTypes.rt3 },
  { id: '8', property_id: 'demo-property-id', guest_id: 'g8', room_type_id: 'rt2', room_id: 'r4', confirmation_code: 'AR-OW39VA', check_in: fmt(subDays(today, 5)), check_out: fmt(subDays(today, 3)), num_guests: 1, status: 'checked_out', source: 'hotels_com', nightly_rate: 129, total_amount: 258, deposit_amount: 0, amount_paid: 266, stripe_payment_id: null, special_requests: null, internal_notes: 'Left positive feedback', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 5).toISOString(), checked_out_at: subDays(today, 3).toISOString(), created_at: subDays(today, 20).toISOString(), updated_at: subDays(today, 3).toISOString(), guest: demoGuests[7], room_type: demoRoomTypes.rt2 },
  { id: '9', property_id: 'demo-property-id', guest_id: 'g9', room_type_id: 'rt4', room_id: 'r7', confirmation_code: 'AR-LM52HD', check_in: fmt(subDays(today, 2)), check_out: fmt(today), num_guests: 1, status: 'checked_in', source: 'direct', nightly_rate: 219, total_amount: 438, deposit_amount: 0, amount_paid: 446.50, stripe_payment_id: null, special_requests: 'Early morning wake-up call at 6am', internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 2).toISOString(), checked_out_at: null, created_at: subDays(today, 10).toISOString(), updated_at: today.toISOString(), guest: demoGuests[8], room_type: demoRoomTypes.rt4 },
  { id: '10', property_id: 'demo-property-id', guest_id: 'g10', room_type_id: 'rt2', room_id: 'r10', confirmation_code: 'AR-AK89NW', check_in: fmt(subDays(today, 3)), check_out: fmt(today), num_guests: 2, status: 'checked_in', source: 'booking_com', nightly_rate: 129, total_amount: 387, deposit_amount: 0, amount_paid: 387, stripe_payment_id: null, special_requests: null, internal_notes: 'Returning guest — room 107 preferred', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 3).toISOString(), checked_out_at: null, created_at: subDays(today, 15).toISOString(), updated_at: today.toISOString(), guest: demoGuests[9], room_type: demoRoomTypes.rt2 },
];

// ============================================================
// Historical demo bookings — realistic year of data
// ============================================================

const HIST_FIRST_NAMES = ['Alice', 'Ben', 'Claire', 'Dan', 'Eve', 'Frank', 'Grace', 'Harry', 'Isla', 'Jack', 'Katie', 'Liam', 'Mia', 'Noah', 'Olivia', 'Peter', 'Quinn', 'Rose', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xander', 'Yasmin', 'Zach'];
const HIST_LAST_NAMES = ['Adams', 'Brown', 'Clark', 'Davis', 'Evans', 'Fisher', 'Green', 'Hall', 'Ito', 'Jones', 'King', 'Lee', 'Moore', 'Nash', 'Owen', 'Patel', 'Reed', 'Shah', 'Taylor', 'Vance', 'Walsh', 'Young', 'Ziegler', 'Costa', 'Müller', 'Kim', 'Singh', 'Russo', 'Berg', 'Novak'];
const HIST_NATS = ['British', 'British', 'British', 'Irish', 'American', 'German', 'French', 'Spanish', 'Italian', 'Dutch', 'Japanese', 'Canadian', 'Australian', 'Polish', 'Swedish', 'Brazilian'];
const HIST_SOURCES: Booking['source'][] = ['direct', 'direct', 'direct', 'booking_com', 'booking_com', 'expedia', 'airbnb', 'hotels_com', 'phone', 'walk_in', 'agoda', 'corporate', 'travel_agent'];

const RT_POOL = [
  { id: 'rt1', rate: 189, name: 'Deluxe Double' },
  { id: 'rt2', rate: 129, name: 'Standard Twin' },
  { id: 'rt3', rate: 289, name: 'Garden Suite' },
  { id: 'rt4', rate: 219, name: 'Sea View Double' },
];

// Seasonal booking counts per month (Jan..Dec) — coastal UK hotel, 10 rooms
const MONTHLY_BOOKING_COUNTS = [10, 9, 12, 15, 19, 22, 26, 27, 21, 16, 11, 14];

function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// Map room_type_id → room ids for historical assignment
const ROOM_IDS_BY_TYPE: Record<string, string[]> = {
  rt1: ['r1', 'r2', 'r9'],
  rt2: ['r3', 'r4', 'r10'],
  rt3: ['r5', 'r6'],
  rt4: ['r7'],
};

function generateHistoricalBookings(): Booking[] {
  const result: Booking[] = [];
  let idCounter = 1000;
  const rand = seededRand(42);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;

  // Generate for past 11 months (not current month — that has live bookings)
  for (let mOffset = 11; mOffset >= 1; mOffset--) {
    const monthStart = startOfMonth(subMonths(today, mOffset));
    const monthEnd = endOfMonth(subMonths(today, mOffset));
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const monthIdx = monthStart.getMonth();
    const count = MONTHLY_BOOKING_COUNTS[monthIdx]!;

    for (let b = 0; b < count; b++) {
      const id = String(++idCounter);
      const guestId = `gh-${id}`;
      const firstName = pick(HIST_FIRST_NAMES);
      const lastName = pick(HIST_LAST_NAMES);
      const nat = pick(HIST_NATS);
      const source = pick(HIST_SOURCES);
      const rt = pick(RT_POOL);

      // Randomise check-in within the month
      const dayOffset = Math.floor(rand() * (daysInMonth - 1));
      const checkIn = addDays(monthStart, dayOffset);
      const nights = Math.max(1, Math.round(1 + rand() * 3.5)); // 1-4 nights
      let checkOut = addDays(checkIn, nights);
      // Clamp check-out to not exceed way past month-end (but can spill a bit — realistic)
      if (checkOut > addDays(monthEnd, 5)) checkOut = addDays(monthEnd, 1);
      const actualNights = differenceInDays(checkOut, checkIn);
      if (actualNights < 1) continue;

      // Slight rate variation ±10%
      const rateVariance = 1 + (rand() - 0.5) * 0.2;
      const nightlyRate = Math.round(rt.rate * rateVariance);
      const total = nightlyRate * actualNights;
      const numGuests = rt.id === 'rt2' ? (rand() > 0.5 ? 2 : 1) : 2;

      const guest: Guest = {
        id: guestId, property_id: 'demo-property-id',
        first_name: firstName, last_name: lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        phone: null, nationality: nat, preferences: {},
        total_stays: Math.floor(rand() * 4) + 1,
        total_spend: total,
        tags: rand() > 0.85 ? ['VIP'] : rand() > 0.7 ? ['Returning'] : [],
        created_at: subDays(checkIn, Math.floor(rand() * 30) + 5).toISOString(),
        updated_at: checkOut.toISOString(),
      };

      const histRoomIds = ROOM_IDS_BY_TYPE[rt.id] ?? [];
      const histRoomId = histRoomIds.length > 0 ? pick(histRoomIds) : null;

      const booking: Booking = {
        id, property_id: 'demo-property-id', guest_id: guestId,
        room_type_id: rt.id, room_id: histRoomId,
        confirmation_code: `AR-H${id.slice(-4)}`,
        check_in: fmt(checkIn), check_out: fmt(checkOut),
        num_guests: numGuests, status: 'checked_out',
        source, nightly_rate: nightlyRate, total_amount: total,
        deposit_amount: 0, amount_paid: total,
        stripe_payment_id: null, special_requests: null, internal_notes: null,
        cancelled_at: null, cancellation_reason: null,
        checked_in_at: checkIn.toISOString(), checked_out_at: checkOut.toISOString(),
        created_at: subDays(checkIn, Math.floor(rand() * 14) + 3).toISOString(),
        updated_at: checkOut.toISOString(),
        guest, room_type: demoRoomTypes[rt.id as keyof typeof demoRoomTypes],
      };

      result.push(booking);
    }
  }

  return result;
}

export const historicalBookings = generateHistoricalBookings();
const allDemoBookings = [...historicalBookings, ...demoBookings];

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
      if (isDemoMode) return allDemoBookings;

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
          const all = queryClient.getQueryData<Booking[]>(['bookings', propertyId]) ?? allDemoBookings;
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

        const rtKey = input.room_type_id as keyof typeof demoRoomTypes;
        const rt = (demoRoomTypes[rtKey] ?? Object.values(demoRoomTypes)[0])!;
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
          id: `g-${id}`, property_id: 'demo-property-id',
          first_name: input.guest.first_name, last_name: input.guest.last_name,
          email: input.guest.email || null, phone: input.guest.phone || null,
          nationality: null, preferences: {}, total_stays: 0, total_spend: 0, tags: [],
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };

        const newBooking: Booking = {
          id, property_id: 'demo-property-id', guest_id: newGuest.id,
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

      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .upsert({
          property_id: input.property_id, first_name: input.guest.first_name,
          last_name: input.guest.last_name, email: input.guest.email,
          phone: input.guest.phone ?? null,
        }, { onConflict: 'property_id,email' })
        .select().single();

      if (guestError) throw guestError;

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
            if (status === 'checked_out') updates.checked_out_at = new Date().toISOString();
            if (status === 'cancelled') updates.cancelled_at = new Date().toISOString();
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
      if (status === 'checked_out') updates.checked_out_at = new Date().toISOString();
      if (status === 'cancelled') updates.cancelled_at = new Date().toISOString();

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

      toast.success(`Booking ${status.replace('_', ' ')}`);
    },
    onSuccess: () => {
      if (!isDemoMode) {
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
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