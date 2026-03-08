import { useQuery, useQueries, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useProperty } from './useProperty';
import { getHistoricalBookings, getDemoCurrentBookings } from './demoData';
import { logActivity } from './useActivityLog';
import toast from 'react-hot-toast';
import type { FolioEntry, FolioChargeCategory, PaymentMethod, Booking } from '@/types';
import { subDays, addDays, differenceInDays } from 'date-fns';

const today = new Date();
/** Return an ISO string for today's date at the given hour — safe regardless of current wall-clock time */
const todayAt = (hour: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, 0, 0).toISOString();

// ============================================================
// Demo folio entries — auto-posted room charges + extras
// ============================================================

function buildDemoFolios(): Record<string, FolioEntry[]> {
  const folios: Record<string, FolioEntry[]> = {};

  // Booking 1 — Sarah Mitchell, Deluxe Double £189, r1=Room 201, 3-night stay (confirmed, arriving today) — unpaid
  folios['1'] = [
    { id: 'f1-1', booking_id: '1', type: 'charge', category: 'room', description: 'Room Charge — Deluxe Double (Room 201)', amount: 189, quantity: 1, unit_price: 189, posted_by: 'System', posted_at: todayAt(14), is_voided: false },
    { id: 'f1-2', booking_id: '1', type: 'charge', category: 'room', description: 'Room Charge — Deluxe Double (Room 201)', amount: 189, quantity: 1, unit_price: 189, posted_by: 'Night Audit', posted_at: addDays(today, 1).toISOString(), is_voided: false },
    { id: 'f1-3', booking_id: '1', type: 'charge', category: 'room', description: 'Room Charge — Deluxe Double (Room 201)', amount: 189, quantity: 1, unit_price: 189, posted_by: 'Night Audit', posted_at: addDays(today, 2).toISOString(), is_voided: false },
  ];

  // Booking 2 — James O'Brien, Standard Twin £129, r3=Room 105, 2-night stay (confirmed, arriving today) — unpaid
  folios['2'] = [
    { id: 'f2-1', booking_id: '2', type: 'charge', category: 'room', description: 'Room Charge — Standard Twin (Room 105)', amount: 129, quantity: 1, unit_price: 129, posted_by: 'System', posted_at: todayAt(14), is_voided: false },
    { id: 'f2-2', booking_id: '2', type: 'charge', category: 'room', description: 'Room Charge — Standard Twin (Room 105)', amount: 129, quantity: 1, unit_price: 129, posted_by: 'Night Audit', posted_at: addDays(today, 1).toISOString(), is_voided: false },
  ];

  // Booking 3 — Maria Fernandez, Garden Suite £289, r5=Room 302, 3-night stay (departing today) — paid, with extras
  folios['3'] = [
    { id: 'f3-1', booking_id: '3', type: 'charge', category: 'room', description: 'Room Charge — Garden Suite (Room 302)', amount: 289, quantity: 1, unit_price: 289, posted_by: 'System', posted_at: subDays(today, 3).toISOString(), is_voided: false },
    { id: 'f3-2', booking_id: '3', type: 'payment', category: 'room', description: 'Card payment — Direct booking', amount: -867, quantity: 1, unit_price: -867, payment_method: 'card', posted_by: 'System', posted_at: subDays(today, 3).toISOString(), is_voided: false },
    { id: 'f3-3', booking_id: '3', type: 'charge', category: 'room', description: 'Room Charge — Garden Suite (Room 302)', amount: 289, quantity: 1, unit_price: 289, posted_by: 'Night Audit', posted_at: subDays(today, 2).toISOString(), is_voided: false },
    { id: 'f3-4', booking_id: '3', type: 'charge', category: 'room', description: 'Room Charge — Garden Suite (Room 302)', amount: 289, quantity: 1, unit_price: 289, posted_by: 'Night Audit', posted_at: subDays(today, 1).toISOString(), is_voided: false },
    { id: 'f3-5', booking_id: '3', type: 'charge', category: 'spa', description: 'Couples Massage — 60min', amount: 120, quantity: 1, unit_price: 120, posted_by: 'Spa', posted_at: subDays(today, 2).toISOString(), is_voided: false },
    { id: 'f3-6', booking_id: '3', type: 'charge', category: 'food', description: 'Breakfast Buffet × 2 guests', amount: 30, quantity: 2, unit_price: 15, posted_by: 'Restaurant', posted_at: subDays(today, 2).toISOString(), is_voided: false },
    { id: 'f3-7', booking_id: '3', type: 'charge', category: 'laundry', description: 'Express Laundry Service', amount: 25, quantity: 1, unit_price: 25, posted_by: 'Housekeeping', posted_at: subDays(today, 1).toISOString(), is_voided: false },
    { id: 'f3-8', booking_id: '3', type: 'charge', category: 'parking', description: 'Car Park — 3 nights', amount: 30, quantity: 3, unit_price: 10, posted_by: 'Reception', posted_at: subDays(today, 3).toISOString(), is_voided: false },
    { id: 'f3-9', booking_id: '3', type: 'charge', category: 'discount', description: 'Anniversary discount (10%)', amount: -86.70, quantity: 1, unit_price: -86.70, posted_by: 'Manager', posted_at: subDays(today, 1).toISOString(), is_voided: false },
    { id: 'f3-10', booking_id: '3', type: 'payment', category: 'room', description: 'Card payment — ancillary settlement', amount: -118.30, quantity: 1, unit_price: -118.30, payment_method: 'card', posted_by: 'Reception', posted_at: todayAt(9), is_voided: false },
  ];

  // Booking 4 — David Chen, Deluxe Double £189, r2=Room 202, 6-night stay (checked in yesterday)
  folios['4'] = [
    { id: 'f4-1', booking_id: '4', type: 'charge', category: 'room', description: 'Room Charge — Deluxe Double (Room 202)', amount: 189, quantity: 1, unit_price: 189, posted_by: 'System', posted_at: subDays(today, 1).toISOString(), is_voided: false },
    { id: 'f4-2', booking_id: '4', type: 'payment', category: 'room', description: 'Card payment on file', amount: -1134, quantity: 1, unit_price: -1134, payment_method: 'card', posted_by: 'System', posted_at: subDays(today, 1).toISOString(), is_voided: false },
    { id: 'f4-3', booking_id: '4', type: 'charge', category: 'room', description: 'Room Charge — Deluxe Double (Room 202)', amount: 189, quantity: 1, unit_price: 189, posted_by: 'Night Audit', posted_at: todayAt(0), is_voided: false },
    { id: 'f4-4', booking_id: '4', type: 'charge', category: 'food', description: 'Room Service — Club Sandwich & Fries', amount: 18.50, quantity: 1, unit_price: 18.50, posted_by: 'Reception', posted_at: todayAt(12), is_voided: false },
    { id: 'f4-5', booking_id: '4', type: 'charge', category: 'beverage', description: 'Minibar — 2× Craft Beer, 1× Wine', amount: 24, quantity: 3, unit_price: 8, posted_by: 'Housekeeping', posted_at: todayAt(16), is_voided: false },
  ];

  // Booking 5 — Emma Watson, Deluxe Double £189, no room (pending, arriving tomorrow) — unpaid
  folios['5'] = [
    { id: 'f5-1', booking_id: '5', type: 'charge', category: 'room', description: 'Room Charge — Deluxe Double × 2 nights', amount: 378, quantity: 2, unit_price: 189, posted_by: 'System', posted_at: subDays(today, 1).toISOString(), is_voided: false },
  ];

  // Booking 6 — Hiroshi Tanaka, Sea View Double £219, r7=Room 204, 3-night stay (confirmed, future) — unpaid
  folios['6'] = [
    { id: 'f6-1', booking_id: '6', type: 'charge', category: 'room', description: 'Room Charge \u2014 Sea View Double \u00d7 3 nights', amount: 657, quantity: 3, unit_price: 219, posted_by: 'System', posted_at: subDays(today, 10).toISOString(), is_voided: false },
  ];

  // Booking 7 — Sophie Laurent, Garden Suite £289, r6=Room 303, 4-night stay (confirmed, future) — unpaid
  folios['7'] = [
    { id: 'f7-1', booking_id: '7', type: 'charge', category: 'room', description: 'Room Charge — Garden Suite (Room 303) × 4 nights', amount: 1156, quantity: 4, unit_price: 289, posted_by: 'System', posted_at: subDays(today, 30).toISOString(), is_voided: false },
  ];

  // Booking 8 — Oliver Wright, Standard Twin £129, r4=Room 106, 2-night stay (checked out 3 days ago) — fully paid
  folios['8'] = [
    { id: 'f8-1', booking_id: '8', type: 'charge', category: 'room', description: 'Room Charge — Standard Twin (Room 106)', amount: 129, quantity: 1, unit_price: 129, posted_by: 'System', posted_at: subDays(today, 5).toISOString(), is_voided: false },
    { id: 'f8-2', booking_id: '8', type: 'payment', category: 'room', description: 'Card payment at reception', amount: -266, quantity: 1, unit_price: -266, payment_method: 'card', posted_by: 'Reception', posted_at: subDays(today, 5).toISOString(), is_voided: false },
    { id: 'f8-3', booking_id: '8', type: 'charge', category: 'room', description: 'Room Charge — Standard Twin (Room 106)', amount: 129, quantity: 1, unit_price: 129, posted_by: 'Night Audit', posted_at: subDays(today, 4).toISOString(), is_voided: false },
    { id: 'f8-4', booking_id: '8', type: 'charge', category: 'beverage', description: 'Minibar — Soft Drinks', amount: 8, quantity: 2, unit_price: 4, posted_by: 'Housekeeping', posted_at: subDays(today, 4).toISOString(), is_voided: false },
  ];

  // Booking 9 — Liam Murphy, Sea View Double £219, r7=Room 204, 2-night stay (departing today) — fully paid
  folios['9'] = [
    { id: 'f9-1', booking_id: '9', type: 'charge', category: 'room', description: 'Room Charge — Sea View Double (Room 204)', amount: 219, quantity: 1, unit_price: 219, posted_by: 'Night Audit', posted_at: subDays(today, 1).toISOString(), is_voided: false },
    { id: 'f9-2', booking_id: '9', type: 'payment', category: 'room', description: 'Card payment on file', amount: -446.50, quantity: 1, unit_price: -446.50, payment_method: 'card', posted_by: 'System', posted_at: subDays(today, 2).toISOString(), is_voided: false },
    { id: 'f9-3', booking_id: '9', type: 'charge', category: 'room', description: 'Room Charge — Sea View Double (Room 204)', amount: 219, quantity: 1, unit_price: 219, posted_by: 'Night Audit', posted_at: todayAt(0), is_voided: false },
    { id: 'f9-4', booking_id: '9', type: 'charge', category: 'phone', description: 'International Call — 12 min', amount: 8.50, quantity: 1, unit_price: 8.50, posted_by: 'System', posted_at: subDays(today, 1).toISOString(), is_voided: false },
  ];

  // Booking 10 — Anna Kowalski, Standard Twin £129, r10=Room 107, 3-night stay (departing today) — fully paid
  folios['10'] = [
    { id: 'f10-1', booking_id: '10', type: 'charge', category: 'room', description: 'Room Charge — Standard Twin (Room 107)', amount: 129, quantity: 1, unit_price: 129, posted_by: 'Night Audit', posted_at: subDays(today, 2).toISOString(), is_voided: false },
    { id: 'f10-2', booking_id: '10', type: 'payment', category: 'room', description: 'Online payment', amount: -387, quantity: 1, unit_price: -387, payment_method: 'online', posted_by: 'System', posted_at: subDays(today, 3).toISOString(), is_voided: false },
    { id: 'f10-3', booking_id: '10', type: 'charge', category: 'room', description: 'Room Charge — Standard Twin (Room 107)', amount: 129, quantity: 1, unit_price: 129, posted_by: 'Night Audit', posted_at: subDays(today, 1).toISOString(), is_voided: false },
    { id: 'f10-4', booking_id: '10', type: 'charge', category: 'room', description: 'Room Charge — Standard Twin (Room 107)', amount: 129, quantity: 1, unit_price: 129, posted_by: 'Night Audit', posted_at: todayAt(0), is_voided: false },
  ];

  return folios;
}

const baseFolios = buildDemoFolios();

// ============================================================
// Historical folio entries for generated bookings (ids 1001+)
// ============================================================

const EXTRA_CATEGORIES: FolioChargeCategory[] = ['food', 'beverage', 'spa', 'laundry', 'parking', 'phone'];
const EXTRA_DESCS: Record<string, string[]> = {
  food: ['Breakfast Buffet', 'Room Service — Dinner', 'Restaurant Lunch', 'Afternoon Tea'],
  beverage: ['Minibar — Beer & Wine', 'Minibar — Soft Drinks', 'Bar Tab — Cocktails'],
  spa: ['Swedish Massage — 60min', 'Facial Treatment', 'Couples Massage'],
  laundry: ['Express Laundry', 'Dry Cleaning — Suit'],
  parking: ['Car Park — per night', 'Valet Parking'],
  phone: ['Local Call', 'International Call — 8 min'],
};
const EXTRA_PRICES: Record<string, number[]> = {
  food: [15, 28, 22, 18],
  beverage: [24, 8, 32],
  spa: [85, 65, 120],
  laundry: [25, 35],
  parking: [10, 15],
  phone: [2, 8.5],
};
const PAYMENT_METHODS: PaymentMethod[] = ['card', 'card', 'card', 'online', 'online', 'cash', 'bank_transfer'];

function seededRandFolio(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateHistoricalFolios(historicalBookings: Booking[]): Record<string, FolioEntry[]> {
  const folios: Record<string, FolioEntry[]> = {};
  const rand = seededRandFolio(123);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;

  for (const b of historicalBookings) {
    const entries: FolioEntry[] = [];
    const checkIn = new Date(b.check_in);
    const checkOut = new Date(b.check_out);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));
    const nightlyRate = b.nightly_rate;
    let fIdx = 0;

    // Room charges — one per night
    for (let n = 0; n < nights; n++) {
      entries.push({
        id: `fh-${b.id}-${++fIdx}`,
        booking_id: b.id,
        type: 'charge',
        category: 'room',
        description: `Room Charge — Night ${n + 1}`,
        amount: nightlyRate,
        quantity: 1,
        unit_price: nightlyRate,
        posted_by: n === 0 ? 'System' : 'Night Audit',
        posted_at: addDays(checkIn, n).toISOString(),
        is_voided: false,
      });
    }

    // Random extras — 0-3 per booking (more likely in summer)
    const monthIdx = checkIn.getMonth();
    const extraChance = monthIdx >= 5 && monthIdx <= 8 ? 0.6 : 0.35;
    const numExtras = rand() < extraChance ? (rand() < 0.4 ? 2 : 1) + (rand() < 0.2 ? 1 : 0) : 0;
    let extraTotal = 0;

    for (let e = 0; e < numExtras; e++) {
      const cat = pick(EXTRA_CATEGORIES);
      const descs = EXTRA_DESCS[cat] ?? ['Charge'];
      const prices = EXTRA_PRICES[cat] ?? [10];
      const desc = pick(descs);
      const price = pick(prices);
      const qty = cat === 'parking' ? nights : (rand() > 0.7 ? 2 : 1);
      const amt = price * qty;
      extraTotal += amt;

      const postDay = Math.min(Math.floor(rand() * nights), nights - 1);
      entries.push({
        id: `fh-${b.id}-${++fIdx}`,
        booking_id: b.id,
        type: 'charge',
        category: cat,
        description: desc,
        amount: amt,
        quantity: qty,
        unit_price: price,
        posted_by: pick(['Reception', 'Restaurant', 'Housekeeping', 'Spa', 'System']),
        posted_at: addDays(checkIn, postDay).toISOString(),
        is_voided: false,
      });
    }

    // Payment — covers full amount
    const total = nightlyRate * nights;
    const payMethod = pick(PAYMENT_METHODS);
    entries.push({
      id: `fh-${b.id}-${++fIdx}`,
      booking_id: b.id,
      type: 'payment',
      category: 'room',
      description: `Payment \u2014 ${payMethod}`,
      amount: -(total + extraTotal),
      quantity: 1,
      unit_price: -(total + extraTotal),
      payment_method: payMethod,
      posted_by: 'System',
      posted_at: checkIn.toISOString(),
      is_voided: false,
    });

    // Sync booking.amount_paid to include extras (room + extras = actual payment)
    if (extraTotal > 0) {
      (b as any).amount_paid = total + extraTotal;
      (b as any).total_amount = total + extraTotal;
    }

    folios[b.id] = entries;
  }

  return folios;
}

// ── Auto-generate folios from booking data (for properties 2 & 3 current bookings) ──
function generateFolioFromBooking(b: Booking): FolioEntry[] {
  const checkIn = new Date(b.check_in);
  const checkOut = new Date(b.check_out);
  const nights = Math.max(1, differenceInDays(checkOut, checkIn));
  const entries: FolioEntry[] = [];
  let fIdx = 0;

  // Room charges — one per night
  for (let n = 0; n < nights; n++) {
    entries.push({
      id: `fa-${b.id}-${++fIdx}`, booking_id: b.id, type: 'charge', category: 'room',
      description: `Room Charge — ${b.room_type?.name ?? 'Room'} (Night ${n + 1})`,
      amount: b.nightly_rate, quantity: 1, unit_price: b.nightly_rate,
      posted_by: n === 0 ? 'System' : 'Night Audit',
      posted_at: addDays(checkIn, n).toISOString(), is_voided: false,
    });
  }

  // Payment if amount_paid > 0
  if (b.amount_paid > 0) {
    entries.push({
      id: `fa-${b.id}-${++fIdx}`, booking_id: b.id, type: 'payment', category: 'room',
      description: b.status === 'checked_out' ? 'Card payment at checkout' : 'Card payment on file',
      amount: -b.amount_paid, quantity: 1, unit_price: -b.amount_paid,
      payment_method: 'card', posted_by: 'System',
      posted_at: checkIn.toISOString(), is_voided: false,
    });
  }

  return entries;
}

// ── Lazily-computed per-property folio map ──
const folioMapCache = new Map<string, Record<string, FolioEntry[]>>();

function getDemoFolios(propertyId: string): Record<string, FolioEntry[]> {
  if (folioMapCache.has(propertyId)) return folioMapCache.get(propertyId)!;

  const historical = getHistoricalBookings(propertyId);
  const histFolios = generateHistoricalFolios(historical);

  let currentFolios: Record<string, FolioEntry[]>;
  if (propertyId === 'demo-property-id') {
    // Property 1 has detailed handcrafted folios
    currentFolios = baseFolios;
  } else {
    // Other properties: auto-generate from booking data
    currentFolios = {};
    const currentBookings = getDemoCurrentBookings(propertyId);
    for (const b of currentBookings) {
      currentFolios[b.id] = generateFolioFromBooking(b);
    }
  }

  const all = { ...histFolios, ...currentFolios };
  folioMapCache.set(propertyId, all);
  return all;
}

// ============================================================
// Hook
// ============================================================

export function useFolios(bookingId: string) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();

  // Fetch folio entries for a booking
  const folioQuery = useQuery({
    queryKey: ['folio', bookingId],
    queryFn: async () => {
      if (isDemoMode) {
        return queryClient.getQueryData<FolioEntry[]>(['folio', bookingId])
          ?? getDemoFolios(propertyId ?? 'demo-property-id')[bookingId] ?? [];
      }
      const { data, error } = await supabase
        .from('folio_entries')
        .select('*')
        .eq('booking_id', bookingId)
        .order('posted_at', { ascending: true });
      if (error) throw error;
      return data as FolioEntry[];
    },
    enabled: !!bookingId,
  });

  // Post a new charge
  const postCharge = useMutation({
    mutationFn: async (input: {
      category: FolioChargeCategory;
      description: string;
      quantity: number;
      unit_price: number;
      notes?: string;
    }) => {
      const entry: FolioEntry = {
        id: `f-${Date.now()}`,
        booking_id: bookingId,
        type: 'charge',
        category: input.category,
        description: input.description,
        amount: input.quantity * input.unit_price,
        quantity: input.quantity,
        unit_price: input.unit_price,
        posted_by: isDemoMode ? 'Alex Demo' : 'Staff',
        posted_at: new Date().toISOString(),
        is_voided: false,
        notes: input.notes,
      };

      if (isDemoMode) {
        queryClient.setQueryData<FolioEntry[]>(['folio', bookingId], (old) => [...(old ?? []), entry]);
        logActivity(queryClient, null, {
          action: 'folio_charge_posted', entity_type: 'folio', entity_id: bookingId,
          description: `${input.category} charge £${(input.quantity * input.unit_price).toFixed(2)} posted to Booking #${bookingId}`,
          performed_by: 'Reception',
        });
        toast.success('Charge posted to folio');
        return entry;
      }

      const { data, error } = await supabase.from('folio_entries').insert({
        booking_id: entry.booking_id,
        type: entry.type,
        category: entry.category,
        description: entry.description,
        amount: entry.amount,
        quantity: entry.quantity,
        unit_price: entry.unit_price,
        posted_by: entry.posted_by,
        posted_at: entry.posted_at,
        is_voided: entry.is_voided,
        notes: entry.notes,
      }).select().single();
      if (error) throw error;
      toast.success('Charge posted to folio');
      return data as FolioEntry;
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['folio', bookingId] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Record a payment
  const postPayment = useMutation({
    mutationFn: async (input: {
      amount: number;
      payment_method: PaymentMethod;
      description?: string;
      notes?: string;
    }) => {
      const entry: FolioEntry = {
        id: `f-${Date.now()}`,
        booking_id: bookingId,
        type: 'payment',
        category: 'room',
        description: input.description || `Payment received — ${input.payment_method}`,
        amount: -Math.abs(input.amount),
        quantity: 1,
        unit_price: -Math.abs(input.amount),
        payment_method: input.payment_method,
        posted_by: isDemoMode ? 'Alex Demo' : 'Staff',
        posted_at: new Date().toISOString(),
        is_voided: false,
        notes: input.notes,
      };

      if (isDemoMode) {
        queryClient.setQueryData<FolioEntry[]>(['folio', bookingId], (old) => [...(old ?? []), entry]);
        // Sync booking.amount_paid with folio payment
        const allBookingQueries = queryClient.getQueriesData<Booking[]>({ queryKey: ['bookings'] });
        for (const [key, bookings] of allBookingQueries) {
          if (!bookings) continue;
          queryClient.setQueryData(key, bookings.map(b =>
            b.id === bookingId ? { ...b, amount_paid: b.amount_paid + Math.abs(input.amount) } : b
          ));
        }
        logActivity(queryClient, null, {
          action: 'folio_payment_received', entity_type: 'folio', entity_id: bookingId,
          description: `Payment £${Math.abs(input.amount).toFixed(2)} received for Booking #${bookingId}`,
          performed_by: 'Reception',
        });
        toast.success('Payment recorded');
        return entry;
      }

      const { data, error } = await supabase.from('folio_entries').insert({
        booking_id: entry.booking_id,
        type: entry.type,
        category: entry.category,
        description: entry.description,
        amount: entry.amount,
        quantity: entry.quantity,
        unit_price: entry.unit_price,
        payment_method: entry.payment_method,
        posted_by: entry.posted_by,
        posted_at: entry.posted_at,
        is_voided: entry.is_voided,
        notes: entry.notes,
      }).select().single();
      if (error) throw error;
      toast.success('Payment recorded');
      return data as FolioEntry;
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['folio', bookingId] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Record a deposit (pre-payment, held against future charges)
  const postDeposit = useMutation({
    mutationFn: async (input: {
      amount: number;
      payment_method: PaymentMethod;
      description?: string;
      notes?: string;
    }) => {
      const entry: FolioEntry = {
        id: `f-${Date.now()}`,
        booking_id: bookingId,
        type: 'payment',
        category: 'room',
        description: input.description || `Deposit received — ${input.payment_method}`,
        amount: -Math.abs(input.amount),
        quantity: 1,
        unit_price: -Math.abs(input.amount),
        payment_method: input.payment_method,
        posted_by: isDemoMode ? 'Alex Demo' : 'Staff',
        posted_at: new Date().toISOString(),
        is_voided: false,
        notes: input.notes || 'Pre-stay deposit',
      };

      if (isDemoMode) {
        queryClient.setQueryData<FolioEntry[]>(['folio', bookingId], (old) => [...(old ?? []), entry]);
        // Sync booking.deposit_amount and amount_paid
        const allBookingQueries = queryClient.getQueriesData<Booking[]>({ queryKey: ['bookings'] });
        for (const [key, bookings] of allBookingQueries) {
          if (!bookings) continue;
          queryClient.setQueryData(key, bookings.map(b =>
            b.id === bookingId ? { ...b, deposit_amount: b.deposit_amount + Math.abs(input.amount), amount_paid: b.amount_paid + Math.abs(input.amount) } : b
          ));
        }
        toast.success(`Deposit of \u00a3${input.amount.toFixed(2)} recorded`);
        return entry;
      }

      const { data, error } = await supabase.from('folio_entries').insert({
        booking_id: entry.booking_id,
        type: entry.type,
        category: entry.category,
        description: entry.description,
        amount: entry.amount,
        quantity: entry.quantity,
        unit_price: entry.unit_price,
        payment_method: entry.payment_method,
        posted_by: entry.posted_by,
        posted_at: entry.posted_at,
        is_voided: entry.is_voided,
        notes: entry.notes,
      }).select().single();
      if (error) throw error;
      toast.success(`Deposit of £${input.amount.toFixed(2)} recorded`);
      return data as FolioEntry;
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['folio', bookingId] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Process a refund
  const postRefund = useMutation({
    mutationFn: async (input: {
      amount: number;
      payment_method: PaymentMethod;
      reason: string;
      notes?: string;
    }) => {
      const entry: FolioEntry = {
        id: `f-${Date.now()}`,
        booking_id: bookingId,
        type: 'refund',
        category: 'room',
        description: `Refund — ${input.reason}`,
        amount: -Math.abs(input.amount),
        quantity: 1,
        unit_price: -Math.abs(input.amount),
        payment_method: input.payment_method,
        posted_by: isDemoMode ? 'Alex Demo' : 'Staff',
        posted_at: new Date().toISOString(),
        is_voided: false,
        notes: input.notes,
      };

      if (isDemoMode) {
        queryClient.setQueryData<FolioEntry[]>(['folio', bookingId], (old) => [...(old ?? []), entry]);        // Sync booking.amount_paid — reduce by refund amount
        const allBookingQueries = queryClient.getQueriesData<Booking[]>({ queryKey: ['bookings'] });
        for (const [key, bookings] of allBookingQueries) {
          if (!bookings) continue;
          queryClient.setQueryData(key, bookings.map(b =>
            b.id === bookingId ? { ...b, amount_paid: b.amount_paid - Math.abs(input.amount) } : b
          ));
        }        toast.success(`Refund of £${input.amount.toFixed(2)} processed`);
        return entry;
      }

      const { data, error } = await supabase.from('folio_entries').insert({
        booking_id: entry.booking_id,
        type: entry.type,
        category: entry.category,
        description: entry.description,
        amount: entry.amount,
        quantity: entry.quantity,
        unit_price: entry.unit_price,
        payment_method: entry.payment_method,
        posted_by: entry.posted_by,
        posted_at: entry.posted_at,
        is_voided: entry.is_voided,
        notes: entry.notes,
      }).select().single();
      if (error) throw error;
      toast.success(`Refund of £${input.amount.toFixed(2)} processed`);
      return data as FolioEntry;
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['folio', bookingId] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Void an entry
  const voidEntry = useMutation({
    mutationFn: async (entryId: string) => {
      if (isDemoMode) {
        const currentEntries = queryClient.getQueryData<FolioEntry[]>(['folio', bookingId]) ?? [];
        const voidedEntry = currentEntries.find(e => e.id === entryId);
        queryClient.setQueryData<FolioEntry[]>(['folio', bookingId], (old) =>
          (old ?? []).map((e) =>
            e.id === entryId ? { ...e, is_voided: true, voided_by: 'Alex Demo', voided_at: new Date().toISOString() } : e
          )
        );
        // Sync booking.amount_paid when voiding payment or refund entries
        if (voidedEntry && (voidedEntry.type === 'payment' || voidedEntry.type === 'refund')) {
          const allBookingQueries = queryClient.getQueriesData<Booking[]>({ queryKey: ['bookings'] });
          for (const [key, bookings] of allBookingQueries) {
            if (!bookings) continue;
            queryClient.setQueryData(key, bookings.map(b => {
              if (b.id !== bookingId) return b;
              if (voidedEntry.type === 'payment') {
                // Voiding a payment reduces amount_paid
                return { ...b, amount_paid: b.amount_paid - Math.abs(voidedEntry.amount) };
              }
              // Voiding a refund increases amount_paid (restores the refunded amount)
              return { ...b, amount_paid: b.amount_paid + Math.abs(voidedEntry.amount) };
            }));
          }
        }
        toast.success('Entry voided');
        return;
      }

      const { error } = await supabase
        .from('folio_entries')
        .update({ is_voided: true, voided_by: 'Staff', voided_at: new Date().toISOString() })
        .eq('id', entryId);
      if (error) throw error;
      toast.success('Entry voided');
    },
    onSuccess: () => { if (!isDemoMode) queryClient.invalidateQueries({ queryKey: ['folio', bookingId] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Computed totals
  const entries = folioQuery.data ?? [];
  const activeEntries = entries.filter((e) => !e.is_voided);
  const totalCharges = activeEntries.filter((e) => e.type === 'charge' || e.type === 'adjustment').reduce((s, e) => s + e.amount, 0);
  const totalPayments = activeEntries.filter((e) => e.type === 'payment').reduce((s, e) => s + Math.abs(e.amount), 0);
  const totalRefunds = activeEntries.filter((e) => e.type === 'refund').reduce((s, e) => s + Math.abs(e.amount), 0);
  const balance = totalCharges - totalPayments + totalRefunds;

  return {
    entries,
    isLoading: folioQuery.isLoading,
    totalCharges,
    totalPayments,
    balance,
    postCharge,
    postPayment,
    postDeposit,
    postRefund,
    voidEntry,
  };
}

// ============================================================
// Hook — All Folios aggregated (for reports / dashboards)
// ============================================================

/** Find demo folio entries for a booking across all properties (IDs are unique) */
function findDemoFolio(bookingId: string): FolioEntry[] {
  for (const pid of ['demo-property-id', 'demo-property-2', 'demo-property-3']) {
    const folios = getDemoFolios(pid);
    if (folios[bookingId]) return folios[bookingId]!;
  }
  return [];
}

export function useAllFolios(bookingIds: string[]) {
  const results = useQueries({
    queries: bookingIds.map(id => ({
      queryKey: ['folio', id] as const,
      queryFn: async () => {
        if (isDemoMode) return findDemoFolio(id);
        const { data, error } = await supabase
          .from('folio_entries')
          .select('*')
          .eq('booking_id', id)
          .order('posted_at', { ascending: true });
        if (error) throw error;
        return data as FolioEntry[];
      },
    })),
  });

  const allEntries = results.flatMap(r => r.data ?? []);
  const isLoading = results.some(r => r.isLoading);

  return { allEntries, isLoading };
}

// ============================================================
// Utility — compute folio balance from cache (for checkout guard)
// ============================================================

export function getFolioBalance(queryClient: QueryClient, bookingId: string): number {
  const entries = queryClient.getQueryData<FolioEntry[]>(['folio', bookingId])
    ?? (isDemoMode ? findDemoFolio(bookingId) : []);
  const active = entries.filter(e => !e.is_voided);
  const charges = active.filter(e => e.type === 'charge' || e.type === 'adjustment').reduce((s, e) => s + e.amount, 0);
  const payments = active.filter(e => e.type === 'payment').reduce((s, e) => s + Math.abs(e.amount), 0);
  const refunds = active.filter(e => e.type === 'refund').reduce((s, e) => s + Math.abs(e.amount), 0);
  return charges - payments + refunds;
}
