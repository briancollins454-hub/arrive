/**
 * Centralized demo data for multi-property demonstration.
 * Each property has unique room types, rooms, guests, current bookings, and historical bookings.
 * All data is memoised by propertyId for stable React Query references.
 */

import type { RoomType, Room, Guest, Booking } from '@/types';
import { format, addDays, subDays, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

// ── Helpers ─────────────────────────────────────────────────
const today = new Date();
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const ts = today.toISOString();
const ago = (days: number) => new Date(today.getTime() - days * 86400000).toISOString();

const PID1 = 'demo-property-id';
const PID2 = 'demo-property-2';
const PID3 = 'demo-property-3';

// ════════════════════════════════════════════════════════════
// PROPERTY 1 — The Grand Harbour Hotel, Brighton (10 rooms)
// ════════════════════════════════════════════════════════════

const p1RoomTypes: RoomType[] = [
  { id: 'rt1', property_id: PID1, name: 'Deluxe Double', description: 'Spacious double room with harbour view, king-size bed, and luxury bathroom.', base_rate: 189, max_occupancy: 2, amenities: ['wifi', 'tv', 'sea_view', 'tea_coffee', 'hairdryer', 'safe', 'air_con'], images: [], bed_config: [{ type: 'king', count: 1 }], sort_order: 1, is_active: true, created_at: '', updated_at: '' },
  { id: 'rt2', property_id: PID1, name: 'Standard Twin', description: 'Comfortable twin room ideal for friends or colleagues travelling together.', base_rate: 129, max_occupancy: 2, amenities: ['wifi', 'tv', 'tea_coffee', 'hairdryer', 'desk'], images: [], bed_config: [{ type: 'twin', count: 2 }], sort_order: 2, is_active: true, created_at: '', updated_at: '' },
  { id: 'rt3', property_id: PID1, name: 'Garden Suite', description: 'Luxurious suite with private garden terrace, super king bed, and separate living area.', base_rate: 289, max_occupancy: 3, amenities: ['wifi', 'tv', 'minibar', 'garden_view', 'balcony', 'bath', 'air_con', 'safe', 'living_area'], images: [], bed_config: [{ type: 'super_king', count: 1 }], sort_order: 3, is_active: true, created_at: '', updated_at: '' },
  { id: 'rt4', property_id: PID1, name: 'Sea View Double', description: 'Elegant double with panoramic sea views and balcony.', base_rate: 219, max_occupancy: 2, amenities: ['wifi', 'tv', 'sea_view', 'balcony', 'tea_coffee', 'minibar', 'safe'], images: [], bed_config: [{ type: 'king', count: 1 }], sort_order: 4, is_active: true, created_at: '', updated_at: '' },
];

const p1Rooms: Room[] = [
  { id: 'r1', property_id: PID1, room_type_id: 'rt1', room_number: '201', floor: 2, status: 'reserved', housekeeping_status: 'clean', notes: null, created_at: '', updated_at: '' },
  { id: 'r2', property_id: PID1, room_type_id: 'rt1', room_number: '202', floor: 2, status: 'occupied', housekeeping_status: 'serviced', notes: null, created_at: '', updated_at: '' },
  { id: 'r3', property_id: PID1, room_type_id: 'rt2', room_number: '105', floor: 1, status: 'reserved', housekeeping_status: 'clean', notes: null, created_at: '', updated_at: '' },
  { id: 'r4', property_id: PID1, room_type_id: 'rt2', room_number: '106', floor: 1, status: 'available', housekeeping_status: 'inspected', notes: null, created_at: '', updated_at: '' },
  { id: 'r5', property_id: PID1, room_type_id: 'rt3', room_number: '302', floor: 3, status: 'occupied', housekeeping_status: 'serviced', notes: null, created_at: '', updated_at: '' },
  { id: 'r6', property_id: PID1, room_type_id: 'rt3', room_number: '303', floor: 3, status: 'reserved', housekeeping_status: 'clean', notes: null, created_at: '', updated_at: '' },
  { id: 'r7', property_id: PID1, room_type_id: 'rt4', room_number: '204', floor: 2, status: 'occupied', housekeeping_status: 'serviced', notes: null, created_at: '', updated_at: '' },
  { id: 'r8', property_id: PID1, room_type_id: 'rt4', room_number: '205', floor: 2, status: 'maintenance', housekeeping_status: 'out_of_order', notes: 'Bathroom renovation', created_at: '', updated_at: '' },
  { id: 'r9', property_id: PID1, room_type_id: 'rt1', room_number: '203', floor: 2, status: 'reserved', housekeeping_status: 'clean', notes: null, created_at: '', updated_at: '' },
  { id: 'r10', property_id: PID1, room_type_id: 'rt2', room_number: '107', floor: 1, status: 'occupied', housekeeping_status: 'serviced', notes: null, created_at: '', updated_at: '' },
];

const p1Guests: Guest[] = [
  { id: 'g1', property_id: PID1, first_name: 'Sarah', last_name: 'Mitchell', email: 'sarah@email.com', phone: '+44 7700 123456', nationality: 'British', preferences: { room_pref: 'High floor, quiet room' }, total_stays: 2, total_spend: 1113, tags: ['VIP'], created_at: ago(90), updated_at: ts },
  { id: 'g2', property_id: PID1, first_name: 'James', last_name: "O'Brien", email: 'james@email.com', phone: '+44 7700 654321', nationality: 'Irish', preferences: {}, total_stays: 0, total_spend: 0, tags: [], created_at: ago(14), updated_at: ts },
  { id: 'g3', property_id: PID1, first_name: 'Maria', last_name: 'Fernandez', email: 'maria@email.com', phone: '+34 612 345678', nationality: 'Spanish', preferences: { dietary: 'Vegetarian' }, total_stays: 1, total_spend: 673, tags: ['Returning'], created_at: ago(120), updated_at: ts },
  { id: 'g4', property_id: PID1, first_name: 'David', last_name: 'Chen', email: 'david.chen@email.com', phone: '+44 7700 999888', nationality: 'British', preferences: {}, total_stays: 4, total_spend: 2066, tags: ['VIP', 'Returning'], created_at: ago(365), updated_at: ts },
  { id: 'g5', property_id: PID1, first_name: 'Emma', last_name: 'Watson', email: 'emma.w@email.com', phone: '+44 7700 111222', nationality: 'British', preferences: {}, total_stays: 0, total_spend: 0, tags: [], created_at: ago(2), updated_at: ts },
  { id: 'g6', property_id: PID1, first_name: 'Hiroshi', last_name: 'Tanaka', email: 'hiroshi@email.com', phone: '+81 90 1234 5678', nationality: 'Japanese', preferences: { room_pref: 'High floor' }, total_stays: 0, total_spend: 0, tags: [], created_at: ago(30), updated_at: ts },
  { id: 'g7', property_id: PID1, first_name: 'Sophie', last_name: 'Laurent', email: 'sophie.l@email.com', phone: '+33 6 12 34 56 78', nationality: 'French', preferences: { dietary: 'Gluten-free' }, total_stays: 3, total_spend: 1734, tags: ['VIP', 'Returning'], created_at: ago(200), updated_at: ts },
  { id: 'g8', property_id: PID1, first_name: 'Oliver', last_name: 'Wright', email: 'oliver.wright@email.com', phone: '+44 7911 234567', nationality: 'British', preferences: { notes: 'Early riser' }, total_stays: 2, total_spend: 656, tags: ['Returning'], created_at: ago(60), updated_at: ts },
  { id: 'g9', property_id: PID1, first_name: 'Liam', last_name: 'Murphy', email: 'liam.murphy@email.com', phone: '+353 87 123 4567', nationality: 'Irish', preferences: { room_pref: 'Quiet room' }, total_stays: 0, total_spend: 0, tags: [], created_at: ago(10), updated_at: ts },
  { id: 'g10', property_id: PID1, first_name: 'Anna', last_name: 'Kowalski', email: 'anna.kowalski@email.com', phone: '+48 512 345 678', nationality: 'Polish', preferences: {}, total_stays: 2, total_spend: 853, tags: ['Returning'], created_at: ago(90), updated_at: ts },
];

const p1RtMap = Object.fromEntries(p1RoomTypes.map(rt => [rt.id, rt])) as Record<string, RoomType>;

const p1Bookings: Booking[] = [
  { id: '1', property_id: PID1, guest_id: 'g1', room_type_id: 'rt1', room_id: 'r1', confirmation_code: 'AR-TK82NP', check_in: fmt(today), check_out: fmt(addDays(today, 3)), num_guests: 2, status: 'confirmed', source: 'direct', nightly_rate: 189, total_amount: 567, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: 'Late check-in please (arriving after 9pm)', internal_notes: 'VIP guest — complimentary upgrade if available', cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: ago(7), updated_at: ts, guest: p1Guests[0], room_type: p1RtMap['rt1'] },
  { id: '2', property_id: PID1, guest_id: 'g2', room_type_id: 'rt2', room_id: 'r3', confirmation_code: 'AR-JW93KE', check_in: fmt(today), check_out: fmt(addDays(today, 2)), num_guests: 1, status: 'confirmed', source: 'booking_com', nightly_rate: 129, total_amount: 258, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: null, internal_notes: 'Called to confirm parking', cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: ago(3), updated_at: ts, guest: p1Guests[1], room_type: p1RtMap['rt2'] },
  { id: '3', property_id: PID1, guest_id: 'g3', room_type_id: 'rt3', room_id: 'r5', confirmation_code: 'AR-MF47RL', check_in: fmt(subDays(today, 3)), check_out: fmt(today), num_guests: 2, status: 'checked_in', source: 'direct', nightly_rate: 289, total_amount: 867, deposit_amount: 0, amount_paid: 985.30, stripe_payment_id: null, special_requests: 'Extra pillows please', internal_notes: 'Celebrating anniversary — champagne arranged', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 3).toISOString(), checked_out_at: null, created_at: ago(14), updated_at: ts, guest: p1Guests[2], room_type: p1RtMap['rt3'] },
  { id: '4', property_id: PID1, guest_id: 'g4', room_type_id: 'rt1', room_id: 'r2', confirmation_code: 'AR-DC56WM', check_in: fmt(subDays(today, 1)), check_out: fmt(addDays(today, 5)), num_guests: 2, status: 'checked_in', source: 'direct', nightly_rate: 189, total_amount: 1134, deposit_amount: 0, amount_paid: 1134, stripe_payment_id: null, special_requests: null, internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 1).toISOString(), checked_out_at: null, created_at: ago(21), updated_at: ts, guest: p1Guests[3], room_type: p1RtMap['rt1'] },
  { id: '5', property_id: PID1, guest_id: 'g5', room_type_id: 'rt1', room_id: 'r9', confirmation_code: 'AR-EW28XG', check_in: fmt(addDays(today, 1)), check_out: fmt(addDays(today, 3)), num_guests: 1, status: 'pending', source: 'expedia', nightly_rate: 189, total_amount: 378, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: 'Ground floor if possible', internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: ago(1), updated_at: ts, guest: p1Guests[4], room_type: p1RtMap['rt1'] },
  { id: '6', property_id: PID1, guest_id: 'g6', room_type_id: 'rt4', room_id: 'r7', confirmation_code: 'AR-HT61QP', check_in: fmt(addDays(today, 2)), check_out: fmt(addDays(today, 5)), num_guests: 2, status: 'confirmed', source: 'direct', nightly_rate: 219, total_amount: 657, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: 'Japanese tea if available', internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: ago(10), updated_at: ts, guest: p1Guests[5], room_type: p1RtMap['rt4'] },
  { id: '7', property_id: PID1, guest_id: 'g7', room_type_id: 'rt3', room_id: 'r6', confirmation_code: 'AR-SL74FB', check_in: fmt(addDays(today, 4)), check_out: fmt(addDays(today, 8)), num_guests: 2, status: 'confirmed', source: 'airbnb', nightly_rate: 289, total_amount: 1156, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: 'Gluten-free breakfast options', internal_notes: 'Repeat guest — 4th stay', cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: ago(30), updated_at: ts, guest: p1Guests[6], room_type: p1RtMap['rt3'] },
  { id: '8', property_id: PID1, guest_id: 'g8', room_type_id: 'rt2', room_id: 'r4', confirmation_code: 'AR-OW39VA', check_in: fmt(subDays(today, 5)), check_out: fmt(subDays(today, 3)), num_guests: 1, status: 'checked_out', source: 'hotels_com', nightly_rate: 129, total_amount: 258, deposit_amount: 0, amount_paid: 266, stripe_payment_id: null, special_requests: null, internal_notes: 'Left positive feedback', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 5).toISOString(), checked_out_at: subDays(today, 3).toISOString(), created_at: ago(20), updated_at: subDays(today, 3).toISOString(), guest: p1Guests[7], room_type: p1RtMap['rt2'] },
  { id: '9', property_id: PID1, guest_id: 'g9', room_type_id: 'rt4', room_id: 'r7', confirmation_code: 'AR-LM52HD', check_in: fmt(subDays(today, 2)), check_out: fmt(today), num_guests: 1, status: 'checked_in', source: 'direct', nightly_rate: 219, total_amount: 438, deposit_amount: 0, amount_paid: 446.50, stripe_payment_id: null, special_requests: 'Early morning wake-up call at 6am', internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 2).toISOString(), checked_out_at: null, created_at: ago(10), updated_at: ts, guest: p1Guests[8], room_type: p1RtMap['rt4'] },
  { id: '10', property_id: PID1, guest_id: 'g10', room_type_id: 'rt2', room_id: 'r10', confirmation_code: 'AR-AK89NW', check_in: fmt(subDays(today, 3)), check_out: fmt(today), num_guests: 2, status: 'checked_in', source: 'booking_com', nightly_rate: 129, total_amount: 387, deposit_amount: 0, amount_paid: 387, stripe_payment_id: null, special_requests: null, internal_notes: 'Returning guest — room 107 preferred', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 3).toISOString(), checked_out_at: null, created_at: ago(15), updated_at: ts, guest: p1Guests[9], room_type: p1RtMap['rt2'] },
];

// ════════════════════════════════════════════════════════════
// PROPERTY 2 — The Riverside Inn, Bath (8 rooms)
// ════════════════════════════════════════════════════════════

const p2RoomTypes: RoomType[] = [
  { id: 'p2-rt1', property_id: PID2, name: 'Classic Double', description: 'Comfortable double room overlooking the garden courtyard.', base_rate: 119, max_occupancy: 2, amenities: ['wifi', 'tv', 'tea_coffee', 'hairdryer'], images: [], bed_config: [{ type: 'double', count: 1 }], sort_order: 1, is_active: true, created_at: '', updated_at: '' },
  { id: 'p2-rt2', property_id: PID2, name: 'River View Room', description: 'Bright room with views across the River Avon and Roman bridge.', base_rate: 149, max_occupancy: 2, amenities: ['wifi', 'tv', 'tea_coffee', 'hairdryer', 'river_view', 'desk'], images: [], bed_config: [{ type: 'king', count: 1 }], sort_order: 2, is_active: true, created_at: '', updated_at: '' },
  { id: 'p2-rt3', property_id: PID2, name: 'Family Suite', description: 'Spacious suite with separate sleeping area for children and sitting room.', base_rate: 209, max_occupancy: 4, amenities: ['wifi', 'tv', 'tea_coffee', 'hairdryer', 'minibar', 'living_area', 'bath'], images: [], bed_config: [{ type: 'king', count: 1 }, { type: 'single', count: 2 }], sort_order: 3, is_active: true, created_at: '', updated_at: '' },
  { id: 'p2-rt4', property_id: PID2, name: 'Honeymoon Suite', description: 'Romantic suite with four-poster bed, roll-top bath, and champagne on arrival.', base_rate: 249, max_occupancy: 2, amenities: ['wifi', 'tv', 'minibar', 'bath', 'river_view', 'balcony', 'safe', 'air_con'], images: [], bed_config: [{ type: 'super_king', count: 1 }], sort_order: 4, is_active: true, created_at: '', updated_at: '' },
];

const p2Rooms: Room[] = [
  { id: 'p2-r1', property_id: PID2, room_type_id: 'p2-rt1', room_number: '101', floor: 1, status: 'occupied', housekeeping_status: 'serviced', notes: null, created_at: '', updated_at: '' },
  { id: 'p2-r2', property_id: PID2, room_type_id: 'p2-rt1', room_number: '102', floor: 1, status: 'available', housekeeping_status: 'clean', notes: null, created_at: '', updated_at: '' },
  { id: 'p2-r3', property_id: PID2, room_type_id: 'p2-rt2', room_number: '201', floor: 2, status: 'occupied', housekeeping_status: 'serviced', notes: null, created_at: '', updated_at: '' },
  { id: 'p2-r4', property_id: PID2, room_type_id: 'p2-rt2', room_number: '202', floor: 2, status: 'reserved', housekeeping_status: 'clean', notes: null, created_at: '', updated_at: '' },
  { id: 'p2-r5', property_id: PID2, room_type_id: 'p2-rt3', room_number: '203', floor: 2, status: 'occupied', housekeeping_status: 'serviced', notes: null, created_at: '', updated_at: '' },
  { id: 'p2-r6', property_id: PID2, room_type_id: 'p2-rt3', room_number: '204', floor: 2, status: 'available', housekeeping_status: 'inspected', notes: null, created_at: '', updated_at: '' },
  { id: 'p2-r7', property_id: PID2, room_type_id: 'p2-rt4', room_number: '301', floor: 3, status: 'reserved', housekeeping_status: 'clean', notes: null, created_at: '', updated_at: '' },
  { id: 'p2-r8', property_id: PID2, room_type_id: 'p2-rt1', room_number: '103', floor: 1, status: 'maintenance', housekeeping_status: 'out_of_order', notes: 'Plumbing repair — expected back Friday', created_at: '', updated_at: '' },
];

const p2Guests: Guest[] = [
  { id: 'p2-g1', property_id: PID2, first_name: 'Tom', last_name: 'Harrison', email: 'tom.harrison@email.com', phone: '+44 7800 111222', nationality: 'British', preferences: { room_pref: 'Ground floor' }, total_stays: 3, total_spend: 892, tags: ['Returning'], created_at: ago(180), updated_at: ts },
  { id: 'p2-g2', property_id: PID2, first_name: 'Elena', last_name: 'Rossi', email: 'elena.rossi@email.com', phone: '+39 333 456 7890', nationality: 'Italian', preferences: { dietary: 'Lactose-free' }, total_stays: 1, total_spend: 447, tags: [], created_at: ago(45), updated_at: ts },
  { id: 'p2-g3', property_id: PID2, first_name: 'Catherine', last_name: 'Price', email: 'catherine.price@email.com', phone: '+44 7700 333444', nationality: 'British', preferences: {}, total_stays: 0, total_spend: 0, tags: [], created_at: ago(5), updated_at: ts },
  { id: 'p2-g4', property_id: PID2, first_name: 'Mike', last_name: 'Fitzgerald', email: 'mike.fitz@email.com', phone: '+353 87 654 3210', nationality: 'Irish', preferences: { notes: 'Travelling with two children' }, total_stays: 1, total_spend: 836, tags: [], created_at: ago(60), updated_at: ts },
  { id: 'p2-g5', property_id: PID2, first_name: 'Priya', last_name: 'Sharma', email: 'priya.s@email.com', phone: '+44 7800 555666', nationality: 'British', preferences: {}, total_stays: 0, total_spend: 0, tags: [], created_at: ago(12), updated_at: ts },
  { id: 'p2-g6', property_id: PID2, first_name: 'Thomas', last_name: 'Berger', email: 'thomas.berger@email.com', phone: '+49 170 1234567', nationality: 'German', preferences: {}, total_stays: 1, total_spend: 238, tags: [], created_at: ago(30), updated_at: ts },
  { id: 'p2-g7', property_id: PID2, first_name: 'Hannah', last_name: 'Cole', email: 'h.cole@email.com', phone: '+44 7911 777888', nationality: 'British', preferences: { room_pref: 'Quiet room away from road' }, total_stays: 2, total_spend: 596, tags: ['Returning'], created_at: ago(120), updated_at: ts },
  { id: 'p2-g8', property_id: PID2, first_name: 'Ravi', last_name: 'Patel', email: 'ravi.patel@email.com', phone: '+44 7800 999000', nationality: 'British', preferences: { dietary: 'Vegetarian' }, total_stays: 0, total_spend: 0, tags: [], created_at: ago(3), updated_at: ts },
];

const p2RtMap = Object.fromEntries(p2RoomTypes.map(rt => [rt.id, rt])) as Record<string, RoomType>;

const p2Bookings: Booking[] = [
  { id: 'p2-b1', property_id: PID2, guest_id: 'p2-g1', room_type_id: 'p2-rt1', room_id: 'p2-r1', confirmation_code: 'RI-TH42KA', check_in: fmt(subDays(today, 1)), check_out: fmt(addDays(today, 2)), num_guests: 1, status: 'checked_in', source: 'direct', nightly_rate: 119, total_amount: 357, deposit_amount: 0, amount_paid: 357, stripe_payment_id: null, special_requests: 'Ground floor room please', internal_notes: 'Regular guest — 4th visit', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 1).toISOString(), checked_out_at: null, created_at: ago(14), updated_at: ts, guest: p2Guests[0], room_type: p2RtMap['p2-rt1'] },
  { id: 'p2-b2', property_id: PID2, guest_id: 'p2-g2', room_type_id: 'p2-rt2', room_id: 'p2-r3', confirmation_code: 'RI-ER59MW', check_in: fmt(subDays(today, 2)), check_out: fmt(addDays(today, 1)), num_guests: 2, status: 'checked_in', source: 'booking_com', nightly_rate: 149, total_amount: 447, deposit_amount: 0, amount_paid: 447, stripe_payment_id: null, special_requests: 'Lactose-free milk in room', internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 2).toISOString(), checked_out_at: null, created_at: ago(20), updated_at: ts, guest: p2Guests[1], room_type: p2RtMap['p2-rt2'] },
  { id: 'p2-b3', property_id: PID2, guest_id: 'p2-g4', room_type_id: 'p2-rt3', room_id: 'p2-r5', confirmation_code: 'RI-MF17QC', check_in: fmt(subDays(today, 1)), check_out: fmt(addDays(today, 3)), num_guests: 4, status: 'checked_in', source: 'direct', nightly_rate: 209, total_amount: 836, deposit_amount: 0, amount_paid: 836, stripe_payment_id: null, special_requests: 'Extra towels for children', internal_notes: 'Family of 4 — two children under 10', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 1).toISOString(), checked_out_at: null, created_at: ago(28), updated_at: ts, guest: p2Guests[3], room_type: p2RtMap['p2-rt3'] },
  { id: 'p2-b4', property_id: PID2, guest_id: 'p2-g3', room_type_id: 'p2-rt2', room_id: 'p2-r4', confirmation_code: 'RI-CP83JN', check_in: fmt(today), check_out: fmt(addDays(today, 2)), num_guests: 2, status: 'confirmed', source: 'direct', nightly_rate: 149, total_amount: 298, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: null, internal_notes: 'First-time guest', cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: ago(5), updated_at: ts, guest: p2Guests[2], room_type: p2RtMap['p2-rt2'] },
  { id: 'p2-b5', property_id: PID2, guest_id: 'p2-g5', room_type_id: 'p2-rt4', room_id: 'p2-r7', confirmation_code: 'RI-PS26FD', check_in: fmt(addDays(today, 1)), check_out: fmt(addDays(today, 4)), num_guests: 2, status: 'confirmed', source: 'expedia', nightly_rate: 249, total_amount: 747, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: 'Anniversary celebration — can champagne be arranged?', internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: ago(12), updated_at: ts, guest: p2Guests[4], room_type: p2RtMap['p2-rt4'] },
  { id: 'p2-b6', property_id: PID2, guest_id: 'p2-g6', room_type_id: 'p2-rt1', room_id: 'p2-r2', confirmation_code: 'RI-TB71XE', check_in: fmt(subDays(today, 4)), check_out: fmt(subDays(today, 2)), num_guests: 1, status: 'checked_out', source: 'hotels_com', nightly_rate: 119, total_amount: 238, deposit_amount: 0, amount_paid: 238, stripe_payment_id: null, special_requests: null, internal_notes: 'Left positive review on Hotels.com', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 4).toISOString(), checked_out_at: subDays(today, 2).toISOString(), created_at: ago(18), updated_at: subDays(today, 2).toISOString(), guest: p2Guests[5], room_type: p2RtMap['p2-rt1'] },
  { id: 'p2-b7', property_id: PID2, guest_id: 'p2-g7', room_type_id: 'p2-rt3', room_id: 'p2-r6', confirmation_code: 'RI-HC45WB', check_in: fmt(addDays(today, 3)), check_out: fmt(addDays(today, 5)), num_guests: 2, status: 'confirmed', source: 'direct', nightly_rate: 209, total_amount: 418, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: 'Quiet room away from road', internal_notes: 'Returning guest — 3rd stay', cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: ago(21), updated_at: ts, guest: p2Guests[6], room_type: p2RtMap['p2-rt3'] },
];

// ════════════════════════════════════════════════════════════
// PROPERTY 3 — Clifftop Manor, Salcombe (6 rooms)
// ════════════════════════════════════════════════════════════

const p3RoomTypes: RoomType[] = [
  { id: 'p3-rt1', property_id: PID3, name: 'Coastal Room', description: 'Charming room with countryside views and luxury linen.', base_rate: 169, max_occupancy: 2, amenities: ['wifi', 'tv', 'tea_coffee', 'hairdryer', 'safe'], images: [], bed_config: [{ type: 'king', count: 1 }], sort_order: 1, is_active: true, created_at: '', updated_at: '' },
  { id: 'p3-rt2', property_id: PID3, name: 'Ocean View Suite', description: 'Stunning suite with floor-to-ceiling windows overlooking the Atlantic.', base_rate: 279, max_occupancy: 2, amenities: ['wifi', 'tv', 'sea_view', 'minibar', 'balcony', 'bath', 'air_con', 'safe', 'desk'], images: [], bed_config: [{ type: 'super_king', count: 1 }], sort_order: 2, is_active: true, created_at: '', updated_at: '' },
  { id: 'p3-rt3', property_id: PID3, name: 'Cliff Edge Penthouse', description: 'Exclusive top-floor penthouse with wraparound terrace and private hot tub.', base_rate: 389, max_occupancy: 3, amenities: ['wifi', 'tv', 'sea_view', 'minibar', 'balcony', 'bath', 'air_con', 'safe', 'living_area', 'hot_tub'], images: [], bed_config: [{ type: 'super_king', count: 1 }], sort_order: 3, is_active: true, created_at: '', updated_at: '' },
];

const p3Rooms: Room[] = [
  { id: 'p3-r1', property_id: PID3, room_type_id: 'p3-rt1', room_number: '1', floor: 1, status: 'occupied', housekeeping_status: 'serviced', notes: null, created_at: '', updated_at: '' },
  { id: 'p3-r2', property_id: PID3, room_type_id: 'p3-rt1', room_number: '2', floor: 1, status: 'available', housekeeping_status: 'clean', notes: null, created_at: '', updated_at: '' },
  { id: 'p3-r3', property_id: PID3, room_type_id: 'p3-rt2', room_number: '3', floor: 2, status: 'occupied', housekeeping_status: 'serviced', notes: null, created_at: '', updated_at: '' },
  { id: 'p3-r4', property_id: PID3, room_type_id: 'p3-rt2', room_number: '4', floor: 2, status: 'reserved', housekeeping_status: 'clean', notes: null, created_at: '', updated_at: '' },
  { id: 'p3-r5', property_id: PID3, room_type_id: 'p3-rt3', room_number: '5', floor: 3, status: 'occupied', housekeeping_status: 'serviced', notes: null, created_at: '', updated_at: '' },
  { id: 'p3-r6', property_id: PID3, room_type_id: 'p3-rt1', room_number: '6', floor: 1, status: 'reserved', housekeeping_status: 'clean', notes: null, created_at: '', updated_at: '' },
];

const p3Guests: Guest[] = [
  { id: 'p3-g1', property_id: PID3, first_name: 'Charlotte', last_name: 'Beaumont', email: 'charlotte.beaumont@email.com', phone: '+44 7700 222333', nationality: 'British', preferences: { room_pref: 'Sea view' }, total_stays: 5, total_spend: 3245, tags: ['VIP', 'Returning'], created_at: ago(400), updated_at: ts },
  { id: 'p3-g2', property_id: PID3, first_name: 'Marcus', last_name: 'Hale', email: 'marcus.hale@email.com', phone: '+44 7911 444555', nationality: 'British', preferences: {}, total_stays: 1, total_spend: 1116, tags: [], created_at: ago(30), updated_at: ts },
  { id: 'p3-g3', property_id: PID3, first_name: 'Isabella', last_name: 'Romano', email: 'isabella.romano@email.com', phone: '+39 347 890 1234', nationality: 'Italian', preferences: { dietary: 'Pescatarian' }, total_stays: 0, total_spend: 0, tags: [], created_at: ago(10), updated_at: ts },
  { id: 'p3-g4', property_id: PID3, first_name: 'George', last_name: 'Whitfield', email: 'george.w@email.com', phone: '+44 7800 666777', nationality: 'British', preferences: { notes: 'Requires accessible room' }, total_stays: 2, total_spend: 2334, tags: ['VIP', 'Returning'], created_at: ago(250), updated_at: ts },
  { id: 'p3-g5', property_id: PID3, first_name: 'Amelia', last_name: 'Harding', email: 'amelia.h@email.com', phone: '+44 7700 888999', nationality: 'British', preferences: {}, total_stays: 0, total_spend: 0, tags: [], created_at: ago(7), updated_at: ts },
  { id: 'p3-g6', property_id: PID3, first_name: 'Kenji', last_name: 'Sato', email: 'kenji.sato@email.com', phone: '+81 80 5678 9012', nationality: 'Japanese', preferences: { room_pref: 'High floor' }, total_stays: 1, total_spend: 338, tags: [], created_at: ago(20), updated_at: ts },
];

const p3RtMap = Object.fromEntries(p3RoomTypes.map(rt => [rt.id, rt])) as Record<string, RoomType>;

const p3Bookings: Booking[] = [
  { id: 'p3-b1', property_id: PID3, guest_id: 'p3-g1', room_type_id: 'p3-rt1', room_id: 'p3-r1', confirmation_code: 'CM-CB91PA', check_in: fmt(subDays(today, 2)), check_out: fmt(addDays(today, 1)), num_guests: 2, status: 'checked_in', source: 'direct', nightly_rate: 169, total_amount: 507, deposit_amount: 0, amount_paid: 507, stripe_payment_id: null, special_requests: 'Extra blankets please', internal_notes: 'VIP — 6th stay, complimentary wine', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 2).toISOString(), checked_out_at: null, created_at: ago(30), updated_at: ts, guest: p3Guests[0], room_type: p3RtMap['p3-rt1'] },
  { id: 'p3-b2', property_id: PID3, guest_id: 'p3-g2', room_type_id: 'p3-rt2', room_id: 'p3-r3', confirmation_code: 'CM-MH63VK', check_in: fmt(subDays(today, 1)), check_out: fmt(addDays(today, 3)), num_guests: 2, status: 'checked_in', source: 'direct', nightly_rate: 279, total_amount: 1116, deposit_amount: 0, amount_paid: 1116, stripe_payment_id: null, special_requests: null, internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 1).toISOString(), checked_out_at: null, created_at: ago(14), updated_at: ts, guest: p3Guests[1], room_type: p3RtMap['p3-rt2'] },
  { id: 'p3-b3', property_id: PID3, guest_id: 'p3-g4', room_type_id: 'p3-rt3', room_id: 'p3-r5', confirmation_code: 'CM-GW28DF', check_in: fmt(subDays(today, 3)), check_out: fmt(today), num_guests: 2, status: 'checked_in', source: 'direct', nightly_rate: 389, total_amount: 1167, deposit_amount: 0, amount_paid: 1298.50, stripe_payment_id: null, special_requests: 'Late checkout if possible', internal_notes: 'VIP — penthouse regular', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 3).toISOString(), checked_out_at: null, created_at: ago(21), updated_at: ts, guest: p3Guests[3], room_type: p3RtMap['p3-rt3'] },
  { id: 'p3-b4', property_id: PID3, guest_id: 'p3-g3', room_type_id: 'p3-rt2', room_id: 'p3-r4', confirmation_code: 'CM-IR54TP', check_in: fmt(today), check_out: fmt(addDays(today, 3)), num_guests: 2, status: 'confirmed', source: 'booking_com', nightly_rate: 279, total_amount: 837, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: 'Pescatarian breakfast options please', internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: ago(10), updated_at: ts, guest: p3Guests[2], room_type: p3RtMap['p3-rt2'] },
  { id: 'p3-b5', property_id: PID3, guest_id: 'p3-g5', room_type_id: 'p3-rt1', room_id: 'p3-r6', confirmation_code: 'CM-AH77LS', check_in: fmt(addDays(today, 1)), check_out: fmt(addDays(today, 4)), num_guests: 1, status: 'confirmed', source: 'direct', nightly_rate: 169, total_amount: 507, deposit_amount: 0, amount_paid: 0, stripe_payment_id: null, special_requests: null, internal_notes: null, cancelled_at: null, cancellation_reason: null, checked_in_at: null, checked_out_at: null, created_at: ago(7), updated_at: ts, guest: p3Guests[4], room_type: p3RtMap['p3-rt1'] },
  { id: 'p3-b6', property_id: PID3, guest_id: 'p3-g6', room_type_id: 'p3-rt1', room_id: 'p3-r2', confirmation_code: 'CM-KS39RQ', check_in: fmt(subDays(today, 3)), check_out: fmt(subDays(today, 1)), num_guests: 1, status: 'checked_out', source: 'airbnb', nightly_rate: 169, total_amount: 338, deposit_amount: 0, amount_paid: 338, stripe_payment_id: null, special_requests: null, internal_notes: 'Enjoyed the coastal walk', cancelled_at: null, cancellation_reason: null, checked_in_at: subDays(today, 3).toISOString(), checked_out_at: subDays(today, 1).toISOString(), created_at: ago(15), updated_at: subDays(today, 1).toISOString(), guest: p3Guests[5], room_type: p3RtMap['p3-rt1'] },
];

// ════════════════════════════════════════════════════════════
// Historical booking generator — parameterised by property
// ════════════════════════════════════════════════════════════

const HIST_FIRST_NAMES = ['Alice', 'Ben', 'Claire', 'Dan', 'Eve', 'Frank', 'Grace', 'Harry', 'Isla', 'Jack', 'Katie', 'Liam', 'Mia', 'Noah', 'Olivia', 'Peter', 'Quinn', 'Rose', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xander', 'Yasmin', 'Zach'];
const HIST_LAST_NAMES = ['Adams', 'Brown', 'Clark', 'Davis', 'Evans', 'Fisher', 'Green', 'Hall', 'Ito', 'Jones', 'King', 'Lee', 'Moore', 'Nash', 'Owen', 'Patel', 'Reed', 'Shah', 'Taylor', 'Vance', 'Walsh', 'Young', 'Ziegler', 'Costa', 'Müller', 'Kim', 'Singh', 'Russo', 'Berg', 'Novak'];
const HIST_NATS = ['British', 'British', 'British', 'Irish', 'American', 'German', 'French', 'Spanish', 'Italian', 'Dutch', 'Japanese', 'Canadian', 'Australian', 'Polish', 'Swedish', 'Brazilian'];
const HIST_SOURCES: Booking['source'][] = ['direct', 'direct', 'direct', 'booking_com', 'booking_com', 'expedia', 'airbnb', 'hotels_com', 'phone', 'walk_in', 'agoda', 'corporate', 'travel_agent'];

interface PropertyHistConfig {
  propertyId: string;
  seed: number;
  idStart: number;
  rtPool: { id: string; rate: number; name: string }[];
  roomIdsByType: Record<string, string[]>;
  monthlyCounts: number[];
  rtMap: Record<string, RoomType>;
}

const histConfigs: Record<string, PropertyHistConfig> = {
  [PID1]: {
    propertyId: PID1, seed: 42, idStart: 1000,
    rtPool: [
      { id: 'rt1', rate: 189, name: 'Deluxe Double' },
      { id: 'rt2', rate: 129, name: 'Standard Twin' },
      { id: 'rt3', rate: 289, name: 'Garden Suite' },
      { id: 'rt4', rate: 219, name: 'Sea View Double' },
    ],
    roomIdsByType: { rt1: ['r1', 'r2', 'r9'], rt2: ['r3', 'r4', 'r10'], rt3: ['r5', 'r6'], rt4: ['r7'] },
    monthlyCounts: [10, 9, 12, 15, 19, 22, 26, 27, 21, 16, 11, 14],
    rtMap: p1RtMap,
  },
  [PID2]: {
    propertyId: PID2, seed: 137, idStart: 5000,
    rtPool: [
      { id: 'p2-rt1', rate: 119, name: 'Classic Double' },
      { id: 'p2-rt2', rate: 149, name: 'River View Room' },
      { id: 'p2-rt3', rate: 209, name: 'Family Suite' },
      { id: 'p2-rt4', rate: 249, name: 'Honeymoon Suite' },
    ],
    roomIdsByType: { 'p2-rt1': ['p2-r1', 'p2-r2', 'p2-r8'], 'p2-rt2': ['p2-r3', 'p2-r4'], 'p2-rt3': ['p2-r5', 'p2-r6'], 'p2-rt4': ['p2-r7'] },
    monthlyCounts: [8, 7, 10, 12, 15, 18, 21, 22, 17, 13, 9, 11],
    rtMap: p2RtMap,
  },
  [PID3]: {
    propertyId: PID3, seed: 271, idStart: 8000,
    rtPool: [
      { id: 'p3-rt1', rate: 169, name: 'Coastal Room' },
      { id: 'p3-rt2', rate: 279, name: 'Ocean View Suite' },
      { id: 'p3-rt3', rate: 389, name: 'Cliff Edge Penthouse' },
    ],
    roomIdsByType: { 'p3-rt1': ['p3-r1', 'p3-r2', 'p3-r6'], 'p3-rt2': ['p3-r3', 'p3-r4'], 'p3-rt3': ['p3-r5'] },
    monthlyCounts: [4, 3, 5, 8, 12, 16, 20, 21, 14, 9, 5, 7],
    rtMap: p3RtMap,
  },
};

function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateHistoricalBookings(config: PropertyHistConfig): Booking[] {
  const result: Booking[] = [];
  let idCounter = config.idStart;
  const rand = seededRand(config.seed);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;

  for (let mOffset = 11; mOffset >= 1; mOffset--) {
    const monthStart = startOfMonth(subMonths(today, mOffset));
    const monthEnd = endOfMonth(subMonths(today, mOffset));
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const monthIdx = monthStart.getMonth();
    const count = config.monthlyCounts[monthIdx]!;

    for (let b = 0; b < count; b++) {
      const id = String(++idCounter);
      const guestId = `gh-${config.propertyId}-${id}`;
      const firstName = pick(HIST_FIRST_NAMES);
      const lastName = pick(HIST_LAST_NAMES);
      const nat = pick(HIST_NATS);
      const source = pick(HIST_SOURCES);
      const rt = pick(config.rtPool);

      const dayOffset = Math.floor(rand() * (daysInMonth - 1));
      const checkIn = addDays(monthStart, dayOffset);
      const nights = Math.max(1, Math.round(1 + rand() * 3.5));
      let checkOut = addDays(checkIn, nights);
      if (checkOut > addDays(monthEnd, 5)) checkOut = addDays(monthEnd, 1);
      const actualNights = differenceInDays(checkOut, checkIn);
      if (actualNights < 1) continue;

      const rateVariance = 1 + (rand() - 0.5) * 0.2;
      const nightlyRate = Math.round(rt.rate * rateVariance);
      const total = nightlyRate * actualNights;
      const numGuests = rand() > 0.5 ? 2 : 1;

      const guest: Guest = {
        id: guestId, property_id: config.propertyId,
        first_name: firstName, last_name: lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        phone: null, nationality: nat, preferences: {},
        total_stays: Math.floor(rand() * 4) + 1, total_spend: total,
        tags: rand() > 0.85 ? ['VIP'] : rand() > 0.7 ? ['Returning'] : [],
        created_at: subDays(checkIn, Math.floor(rand() * 30) + 5).toISOString(),
        updated_at: checkOut.toISOString(),
      };

      const histRoomIds = config.roomIdsByType[rt.id] ?? [];
      const histRoomId = histRoomIds.length > 0 ? pick(histRoomIds) : null;

      result.push({
        id, property_id: config.propertyId, guest_id: guestId,
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
        guest, room_type: config.rtMap[rt.id as keyof typeof config.rtMap],
      });
    }
  }

  return result;
}

// ════════════════════════════════════════════════════════════
// Lookup tables + memoised getters
// ════════════════════════════════════════════════════════════

const roomTypesLookup: Record<string, RoomType[]> = {
  [PID1]: p1RoomTypes, [PID2]: p2RoomTypes, [PID3]: p3RoomTypes,
};
const roomsLookup: Record<string, Room[]> = {
  [PID1]: p1Rooms, [PID2]: p2Rooms, [PID3]: p3Rooms,
};
const guestsLookup: Record<string, Guest[]> = {
  [PID1]: p1Guests, [PID2]: p2Guests, [PID3]: p3Guests,
};
const currentBookingsLookup: Record<string, Booking[]> = {
  [PID1]: p1Bookings, [PID2]: p2Bookings, [PID3]: p3Bookings,
};

const historicalCache = new Map<string, Booking[]>();
const allBookingsCache = new Map<string, Booking[]>();

/** Room types for the given property (or default property) */
export function getDemoRoomTypes(propertyId: string): RoomType[] {
  return roomTypesLookup[propertyId] ?? p1RoomTypes;
}

/** Rooms for the given property (or default property) */
export function getDemoRooms(propertyId: string): Room[] {
  return roomsLookup[propertyId] ?? p1Rooms;
}

/** Guests for the given property (or default property) */
export function getDemoGuests(propertyId: string): Guest[] {
  return guestsLookup[propertyId] ?? p1Guests;
}

/** Current (live) bookings for the given property */
export function getDemoCurrentBookings(propertyId: string): Booking[] {
  return currentBookingsLookup[propertyId] ?? p1Bookings;
}

/** Historical (checked-out) bookings for the given property — generated once then cached */
export function getHistoricalBookings(propertyId: string): Booking[] {
  if (historicalCache.has(propertyId)) return historicalCache.get(propertyId)!;
  const config = histConfigs[propertyId] ?? histConfigs[PID1]!;
  const result = generateHistoricalBookings(config);
  historicalCache.set(propertyId, result);
  return result;
}

/** All bookings (historical + current) for the given property — cached */
export function getAllDemoBookings(propertyId: string): Booking[] {
  if (allBookingsCache.has(propertyId)) return allBookingsCache.get(propertyId)!;
  const result = [...getHistoricalBookings(propertyId), ...getDemoCurrentBookings(propertyId)];
  allBookingsCache.set(propertyId, result);
  return result;
}

/** Room-type map (id → RoomType) for the given property */
export function getDemoRoomTypesMap(propertyId: string): Record<string, RoomType> {
  const types = getDemoRoomTypes(propertyId);
  return Object.fromEntries(types.map(rt => [rt.id, rt])) as Record<string, RoomType>;
}

/** Room IDs grouped by room_type_id — useful for room auto-assignment */
export function getRoomIdsByType(propertyId: string): Record<string, string[]> {
  const config = histConfigs[propertyId] ?? histConfigs[PID1]!;
  return config.roomIdsByType;
}
