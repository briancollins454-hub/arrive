-- ============================================================
-- ARRIVÉ — Test Seed Data
-- Run this in the Supabase SQL Editor AFTER both migrations
-- Safe to re-run: deletes previous test data first
-- ============================================================

-- ============================================================
-- 0. CLEAN UP previous test data (order matters for FK refs)
-- ============================================================

DELETE FROM notifications       WHERE property_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM activity_log        WHERE property_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM folio_entries       WHERE booking_id IN (SELECT id FROM bookings WHERE property_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');
DELETE FROM messages            WHERE property_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM message_templates   WHERE property_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM bookings            WHERE property_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM rate_periods        WHERE property_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM guests              WHERE property_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM rooms               WHERE property_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM room_types          WHERE property_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM properties          WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- ============================================================
-- 1. PROPERTY
-- ============================================================

INSERT INTO properties (id, name, slug, description, address, contact, settings, branding)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'The Harbour Hotel',
  'harbour-hotel',
  'A boutique waterfront hotel with stunning harbour views, luxurious rooms, and exceptional service.',
  '{"line1": "12 Harbour Crescent", "city": "Brighton", "county": "East Sussex", "postcode": "BN1 1AA", "country": "GB"}',
  '{"phone": "+44 1234 567890", "email": "hello@harbourhotel.co.uk", "website": "https://harbourhotel.co.uk"}',
  '{
    "check_in_time": "15:00",
    "check_out_time": "11:00",
    "currency": "GBP",
    "timezone": "Europe/London",
    "cancellation_hours": 48,
    "deposit_percentage": 20,
    "allow_same_day_booking": true,
    "max_advance_days": 365
  }',
  '{
    "primary_color": "#D4A853",
    "accent_color": "#0D9488",
    "logo_url": null,
    "cover_images": []
  }'
);

-- ============================================================
-- 2. ROOM TYPES
-- ============================================================

INSERT INTO room_types (id, property_id, name, description, base_rate, max_occupancy, amenities, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Standard Twin',
   'Comfortable twin room with modern amenities and city views.',
   119, 2, '{"WiFi","TV","Kettle","Desk","En-suite"}', 1),

  ('11111111-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Deluxe Double',
   'Spacious double room with harbour views, king bed, and premium furnishings.',
   179, 2, '{"WiFi","TV","Nespresso","MiniBar","Bathrobes","SeaView","Safe","Desk"}', 2),

  ('11111111-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Garden Suite',
   'Luxury suite with separate living area, private garden terrace, and premium amenities.',
   289, 3, '{"WiFi","TV","Nespresso","MiniBar","Bathrobes","Garden","Terrace","Safe","Lounge","RainShower"}', 3);

-- ============================================================
-- 3. ROOMS (6 rooms)
-- ============================================================

INSERT INTO rooms (id, property_id, room_type_id, room_number, floor, status, housekeeping_status) VALUES
  ('22222222-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-0000-0000-0000-000000000001', '101', 1, 'available', 'clean'),
  ('22222222-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-0000-0000-0000-000000000001', '102', 1, 'available', 'clean'),
  ('22222222-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-0000-0000-0000-000000000002', '201', 2, 'available', 'inspected'),
  ('22222222-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-0000-0000-0000-000000000002', '202', 2, 'available', 'clean'),
  ('22222222-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-0000-0000-0000-000000000003', '301', 3, 'available', 'inspected'),
  ('22222222-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-0000-0000-0000-000000000003', '302', 3, 'maintenance', 'out_of_order');

-- ============================================================
-- 4. GUESTS
-- ============================================================

INSERT INTO guests (id, property_id, first_name, last_name, email, phone, nationality, total_stays, total_spend, tags) VALUES
  ('33333333-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah', 'Mitchell', 'sarah.mitchell@email.com', '+44 7700 900001', 'GB', 3, 1850.00, '{"VIP","Returning"}'),
  ('33333333-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'James', 'O''Brien', 'james.obrien@email.com', '+44 7700 900002', 'IE', 1, 520.00, '{}'),
  ('33333333-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Maria', 'Fernandez', 'maria.fernandez@email.com', '+34 612 345 678', 'ES', 2, 1200.00, '{"Returning"}'),
  ('33333333-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'David', 'Chen', 'david.chen@company.com', '+44 7700 900004', 'GB', 1, 0, '{"Corporate"}'),
  ('33333333-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Emma', 'Watson', 'emma.watson@email.com', '+44 7700 900005', 'GB', 0, 0, '{}'),
  ('33333333-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Liam', 'Murphy', 'liam.murphy@email.com', '+353 85 123 4567', 'IE', 1, 580.00, '{}'),
  ('33333333-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sophie', 'Laurent', 'sophie.laurent@email.com', '+33 6 12 34 56 78', 'FR', 0, 0, '{}'),
  ('33333333-0000-0000-0000-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Oliver', 'Wright', 'oliver.wright@email.com', '+44 7700 900008', 'GB', 1, 240.00, '{}');

-- ============================================================
-- 5. BOOKINGS — spread across past, present, future
-- ============================================================

INSERT INTO bookings (id, property_id, guest_id, room_type_id, room_id, confirmation_code, check_in, check_out, num_guests, status, source, nightly_rate, total_amount, deposit_amount, amount_paid, special_requests) VALUES

  -- Past: checked out 5 days ago
  ('44444444-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003',
   'AR-TEST01', CURRENT_DATE - 8, CURRENT_DATE - 5, 1, 'checked_out', 'direct',
   179, 537, 107.40, 537, 'Late check-in please'),

  -- Past: checked out 2 days ago
  ('44444444-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
   'AR-TEST02', CURRENT_DATE - 5, CURRENT_DATE - 2, 1, 'checked_out', 'booking_com',
   119, 357, 0, 357, NULL),

  -- In-house: checked in 2 days ago, departing tomorrow
  ('44444444-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000005',
   'AR-TEST03', CURRENT_DATE - 2, CURRENT_DATE + 1, 2, 'checked_in', 'direct',
   289, 867, 173.40, 500, 'Champagne on arrival'),

  -- In-house: checked in yesterday, departing in 3 days
  ('44444444-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004',
   'AR-TEST04', CURRENT_DATE - 1, CURRENT_DATE + 3, 1, 'checked_in', 'corporate',
   179, 716, 0, 0, 'Corporate invoice to Acme Ltd'),

  -- Arriving today: confirmed
  ('44444444-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003',
   'AR-TEST05', CURRENT_DATE, CURRENT_DATE + 2, 1, 'confirmed', 'direct',
   179, 358, 71.60, 71.60, NULL),

  -- Arriving today: confirmed
  ('44444444-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
   'AR-TEST06', CURRENT_DATE, CURRENT_DATE + 3, 1, 'confirmed', 'phone',
   119, 357, 0, 0, 'Ground floor if possible'),

  -- Future: arriving in 3 days
  ('44444444-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000003', NULL,
   'AR-TEST07', CURRENT_DATE + 3, CURRENT_DATE + 7, 2, 'confirmed', 'airbnb',
   289, 1156, 231.20, 231.20, NULL),

  -- Future: arriving in 5 days
  ('44444444-0000-0000-0000-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', NULL,
   'AR-TEST08', CURRENT_DATE + 5, CURRENT_DATE + 7, 1, 'pending', 'expedia',
   119, 238, 0, 0, NULL),

  -- Cancelled
  ('44444444-0000-0000-0000-000000000009', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', NULL,
   'AR-TEST09', CURRENT_DATE + 10, CURRENT_DATE + 12, 1, 'cancelled', 'direct',
   119, 238, 0, 0, NULL),

  -- No-show yesterday
  ('44444444-0000-0000-0000-000000000010', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002',
   'AR-TEST10', CURRENT_DATE - 1, CURRENT_DATE + 1, 1, 'no_show', 'walk_in',
   119, 238, 0, 0, NULL),

  -- Past: checked out 11 days ago
  ('44444444-0000-0000-0000-000000000011', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004',
   'AR-TEST11', CURRENT_DATE - 14, CURRENT_DATE - 11, 1, 'checked_out', 'direct',
   179, 537, 107.40, 537, NULL);

-- ============================================================
-- 6. FOLIO ENTRIES — charges & payments for each booking
-- ============================================================

-- B1 (past, checked out, 3 nights @ £179 Deluxe)
INSERT INTO folio_entries (booking_id, type, category, description, amount, quantity, unit_price, posted_by, posted_at) VALUES
  ('44444444-0000-0000-0000-000000000001', 'charge', 'room', 'Room Charge — Deluxe Double (Night 1)', 179, 1, 179, 'Night Audit', (CURRENT_DATE - 8)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000001', 'charge', 'room', 'Room Charge — Deluxe Double (Night 2)', 179, 1, 179, 'Night Audit', (CURRENT_DATE - 7)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000001', 'charge', 'room', 'Room Charge — Deluxe Double (Night 3)', 179, 1, 179, 'Night Audit', (CURRENT_DATE - 6)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000001', 'charge', 'food', 'Room Service — Breakfast', 24, 1, 24, 'Restaurant', (CURRENT_DATE - 7)::timestamp + TIME '08:30'),
  ('44444444-0000-0000-0000-000000000001', 'charge', 'beverage', 'Minibar', 18, 1, 18, 'Housekeeping', (CURRENT_DATE - 6)::timestamp + TIME '14:00');
INSERT INTO folio_entries (booking_id, type, category, description, amount, quantity, unit_price, payment_method, posted_by, posted_at) VALUES
  ('44444444-0000-0000-0000-000000000001', 'payment', 'room', 'Card payment at checkout', -579, 1, -579, 'card', 'Reception', (CURRENT_DATE - 5)::timestamp + TIME '10:45');

-- B2 (past, checked out, 3 nights @ £119 Standard)
INSERT INTO folio_entries (booking_id, type, category, description, amount, quantity, unit_price, posted_by, posted_at) VALUES
  ('44444444-0000-0000-0000-000000000002', 'charge', 'room', 'Room Charge — Standard Twin (Night 1)', 119, 1, 119, 'Night Audit', (CURRENT_DATE - 5)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000002', 'charge', 'room', 'Room Charge — Standard Twin (Night 2)', 119, 1, 119, 'Night Audit', (CURRENT_DATE - 4)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000002', 'charge', 'room', 'Room Charge — Standard Twin (Night 3)', 119, 1, 119, 'Night Audit', (CURRENT_DATE - 3)::timestamp + TIME '02:00');
INSERT INTO folio_entries (booking_id, type, category, description, amount, quantity, unit_price, payment_method, posted_by, posted_at) VALUES
  ('44444444-0000-0000-0000-000000000002', 'payment', 'room', 'Card payment at checkout', -357, 1, -357, 'card', 'Reception', (CURRENT_DATE - 2)::timestamp + TIME '10:30');

-- B3 (in-house, Suite, 3 nights, partial payment)
INSERT INTO folio_entries (booking_id, type, category, description, amount, quantity, unit_price, posted_by, posted_at) VALUES
  ('44444444-0000-0000-0000-000000000003', 'charge', 'room', 'Room Charge — Garden Suite (Night 1)', 289, 1, 289, 'Night Audit', (CURRENT_DATE - 2)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000003', 'charge', 'room', 'Room Charge — Garden Suite (Night 2)', 289, 1, 289, 'Night Audit', (CURRENT_DATE - 1)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000003', 'charge', 'spa', 'Full Body Massage — 60min', 120, 1, 120, 'Spa', (CURRENT_DATE - 1)::timestamp + TIME '15:00'),
  ('44444444-0000-0000-0000-000000000003', 'charge', 'food', 'Restaurant — Dinner for 2', 86, 1, 86, 'Restaurant', (CURRENT_DATE - 1)::timestamp + TIME '20:30'),
  ('44444444-0000-0000-0000-000000000003', 'charge', 'beverage', 'Wine — Rioja Reserva', 42, 1, 42, 'Restaurant', (CURRENT_DATE - 1)::timestamp + TIME '20:30');
INSERT INTO folio_entries (booking_id, type, category, description, amount, quantity, unit_price, payment_method, posted_by, posted_at) VALUES
  ('44444444-0000-0000-0000-000000000003', 'payment', 'room', 'Card payment on file (deposit)', -173.40, 1, -173.40, 'card', 'System', (CURRENT_DATE - 2)::timestamp + TIME '09:00'),
  ('44444444-0000-0000-0000-000000000003', 'payment', 'room', 'Card payment', -326.60, 1, -326.60, 'card', 'Reception', (CURRENT_DATE - 1)::timestamp + TIME '16:00');

-- B4 (in-house, Deluxe, 4 nights, no payment yet — corporate)
INSERT INTO folio_entries (booking_id, type, category, description, amount, quantity, unit_price, posted_by, posted_at) VALUES
  ('44444444-0000-0000-0000-000000000004', 'charge', 'room', 'Room Charge — Deluxe Double (Night 1)', 179, 1, 179, 'Night Audit', (CURRENT_DATE - 1)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000004', 'charge', 'room', 'Room Charge — Deluxe Double (Night 2)', 179, 1, 179, 'Night Audit', (CURRENT_DATE)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000004', 'charge', 'food', 'Room Service — Club Sandwich', 18.50, 1, 18.50, 'Restaurant', (CURRENT_DATE - 1)::timestamp + TIME '13:00'),
  ('44444444-0000-0000-0000-000000000004', 'charge', 'laundry', 'Express Laundry — Suit', 35, 1, 35, 'Housekeeping', (CURRENT_DATE)::timestamp + TIME '09:00');

-- B5 (arriving today, deposit paid)
INSERT INTO folio_entries (booking_id, type, category, description, amount, quantity, unit_price, payment_method, posted_by, posted_at) VALUES
  ('44444444-0000-0000-0000-000000000005', 'payment', 'room', 'Deposit payment', -71.60, 1, -71.60, 'card', 'System', (CURRENT_DATE - 3)::timestamp + TIME '14:00');

-- B11 (past, 3 nights Deluxe, checked out 11 days ago)
INSERT INTO folio_entries (booking_id, type, category, description, amount, quantity, unit_price, posted_by, posted_at) VALUES
  ('44444444-0000-0000-0000-000000000011', 'charge', 'room', 'Room Charge — Deluxe Double (Night 1)', 179, 1, 179, 'Night Audit', (CURRENT_DATE - 14)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000011', 'charge', 'room', 'Room Charge — Deluxe Double (Night 2)', 179, 1, 179, 'Night Audit', (CURRENT_DATE - 13)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000011', 'charge', 'room', 'Room Charge — Deluxe Double (Night 3)', 179, 1, 179, 'Night Audit', (CURRENT_DATE - 12)::timestamp + TIME '02:00'),
  ('44444444-0000-0000-0000-000000000011', 'charge', 'food', 'Full English Breakfast x 3', 45, 3, 15, 'Restaurant', (CURRENT_DATE - 12)::timestamp + TIME '08:00'),
  ('44444444-0000-0000-0000-000000000011', 'charge', 'parking', 'Car Park — 3 nights', 30, 3, 10, 'Reception', (CURRENT_DATE - 14)::timestamp + TIME '16:00');
INSERT INTO folio_entries (booking_id, type, category, description, amount, quantity, unit_price, payment_method, posted_by, posted_at) VALUES
  ('44444444-0000-0000-0000-000000000011', 'payment', 'room', 'Card payment at checkout', -612, 1, -612, 'card', 'Reception', (CURRENT_DATE - 11)::timestamp + TIME '10:15');

-- ============================================================
-- 7. RATE PERIODS
-- ============================================================

INSERT INTO rate_periods (property_id, room_type_id, name, start_date, end_date, rate, min_stay, is_active) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-0000-0000-0000-000000000002', 'Easter Peak', CURRENT_DATE + 30, CURRENT_DATE + 44, 229, 2, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-0000-0000-0000-000000000003', 'Easter Peak', CURRENT_DATE + 30, CURRENT_DATE + 44, 349, 2, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', NULL,                                   'Summer Season', CURRENT_DATE + 90, CURRENT_DATE + 150, 199, 1, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-0000-0000-0000-000000000001', 'Midweek Special', CURRENT_DATE + 7, CURRENT_DATE + 60, 99, 1, true);

-- ============================================================
-- 8. MESSAGE TEMPLATES (use the built-in function)
-- ============================================================

SELECT create_default_templates('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- ============================================================
-- 9. ACTIVITY LOG — recent entries
-- ============================================================

INSERT INTO activity_log (property_id, action, entity_type, entity_id, description, performed_by, created_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'booking_checked_in', 'booking', '44444444-0000-0000-0000-000000000003', 'Maria Fernandez checked in — Room 301 (Garden Suite)', 'Reception', (CURRENT_DATE - 2)::timestamp + TIME '15:30'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'booking_checked_in', 'booking', '44444444-0000-0000-0000-000000000004', 'David Chen checked in — Room 202 (Deluxe Double)', 'Reception', (CURRENT_DATE - 1)::timestamp + TIME '16:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'folio_charge_posted', 'folio', '44444444-0000-0000-0000-000000000003', 'Spa charge £120 posted — Full Body Massage', 'Spa', (CURRENT_DATE - 1)::timestamp + TIME '15:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'folio_charge_posted', 'folio', '44444444-0000-0000-0000-000000000004', 'Laundry charge £35 posted — Express Suit', 'Housekeeping', (CURRENT_DATE)::timestamp + TIME '09:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'night_audit_run', 'system', NULL, 'Night audit completed — 2 rooms charged, 1 no-show', 'Night Audit', (CURRENT_DATE)::timestamp + TIME '02:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'booking_created', 'booking', '44444444-0000-0000-0000-000000000005', 'New booking — Emma Watson, Deluxe Double, 2 nights', 'Website', (CURRENT_DATE - 3)::timestamp + TIME '14:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'booking_confirmed', 'booking', '44444444-0000-0000-0000-000000000007', 'Booking confirmed — Sophie Laurent, Garden Suite, 4 nights', 'Airbnb', (CURRENT_DATE - 5)::timestamp + TIME '10:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'housekeeping_updated', 'room', '22222222-0000-0000-0000-000000000003', 'Room 201 marked inspected — ready to sell', 'Supervisor', (CURRENT_DATE - 1)::timestamp + TIME '11:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'booking_checked_out', 'booking', '44444444-0000-0000-0000-000000000001', 'Sarah Mitchell checked out — Room 201', 'Reception', (CURRENT_DATE - 5)::timestamp + TIME '10:45'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'room_status_changed', 'room', '22222222-0000-0000-0000-000000000006', 'Room 302 marked maintenance — bathroom renovation', 'Maintenance', (CURRENT_DATE - 3)::timestamp + TIME '09:00');

-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================

INSERT INTO notifications (property_id, type, title, message, link, is_read, created_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'vip_arrival', 'VIP Expected Today', 'Emma Watson arriving today — Deluxe Double, 2 nights.', '/dashboard/bookings', false, (CURRENT_DATE)::timestamp + TIME '07:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'check_in_due', '2 Arrivals Today', 'Emma Watson and James O''Brien expected today.', '/dashboard/bookings?view=arrivals', false, (CURRENT_DATE)::timestamp + TIME '07:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'check_out_overdue', '1 Departure Tomorrow', 'Maria Fernandez (Room 301) departing tomorrow.', '/dashboard/bookings?view=departures', false, (CURRENT_DATE)::timestamp + TIME '07:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'maintenance_alert', 'Room 302 Out of Order', 'Room 302 (Garden Suite) remains out of order — bathroom renovation.', '/dashboard/housekeeping', false, (CURRENT_DATE - 2)::timestamp + TIME '09:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'night_audit_reminder', 'Night Audit Complete', 'Night audit ran at 02:00 — 2 rooms charged, 1 no-show.', '/dashboard/night-audit', true, (CURRENT_DATE)::timestamp + TIME '02:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'payment_received', 'Payment Received', 'Card payment £326.60 for Booking #B3 (Maria Fernandez).', '/dashboard/bookings', true, (CURRENT_DATE - 1)::timestamp + TIME '16:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'new_booking', 'New Booking', 'Emma Watson booked Deluxe Double for 2 nights.', '/dashboard/bookings', true, (CURRENT_DATE - 3)::timestamp + TIME '14:00');

-- ============================================================
-- DONE — Your test data is ready!
-- ============================================================
