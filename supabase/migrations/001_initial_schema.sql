-- ============================================================
-- ARRIVÉ — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- Required for exclusion constraints

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE room_status AS ENUM ('available', 'occupied', 'maintenance', 'blocked');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');
CREATE TYPE booking_source AS ENUM ('direct', 'phone', 'walk_in', 'booking_com', 'expedia', 'hotels_com', 'airbnb', 'agoda', 'tripadvisor', 'travel_agent', 'corporate', 'other');
CREATE TYPE message_channel AS ENUM ('email', 'sms', 'whatsapp', 'system');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_status AS ENUM ('queued', 'sent', 'delivered', 'failed', 'opened');
CREATE TYPE message_trigger AS ENUM ('booking_confirmed', 'pre_arrival', 'check_in_reminder', 'check_out_reminder', 'post_stay', 'cancellation', 'no_show', 'custom');
CREATE TYPE staff_role AS ENUM ('owner', 'manager', 'receptionist', 'housekeeping');

-- ============================================================
-- PROPERTIES (Hotels)
-- ============================================================

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  address JSONB DEFAULT '{}',
  -- { line1, line2, city, county, postcode, country }
  contact JSONB DEFAULT '{}',
  -- { phone, email, website }
  settings JSONB DEFAULT '{
    "check_in_time": "15:00",
    "check_out_time": "11:00",
    "currency": "GBP",
    "timezone": "Europe/London",
    "cancellation_hours": 48,
    "deposit_percentage": 0,
    "allow_same_day_booking": true,
    "max_advance_days": 365
  }',
  branding JSONB DEFAULT '{
    "primary_color": "#D4A853",
    "accent_color": "#0D9488",
    "logo_url": null,
    "cover_images": []
  }',
  stripe_account_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_properties_slug ON properties(slug);

-- ============================================================
-- ROOM TYPES
-- ============================================================

CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_occupancy INTEGER NOT NULL DEFAULT 2,
  amenities TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  bed_config JSONB DEFAULT '[]',
  -- [{ "type": "double", "count": 1 }]
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_room_types_property ON room_types(property_id);

-- ============================================================
-- ROOMS (Individual physical rooms)
-- ============================================================

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor INTEGER,
  status room_status DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, room_number)
);

CREATE INDEX idx_rooms_property ON rooms(property_id);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);

-- ============================================================
-- RATE PERIODS (Seasonal/event pricing)
-- ============================================================

CREATE TABLE rate_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
  -- NULL = applies to all room types
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  min_stay INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (rate > 0),
  CHECK (min_stay >= 1)
);

CREATE INDEX idx_rate_periods_property ON rate_periods(property_id);
CREATE INDEX idx_rate_periods_dates ON rate_periods(property_id, start_date, end_date);

-- ============================================================
-- GUESTS
-- ============================================================

CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  nationality TEXT,
  preferences JSONB DEFAULT '{}',
  -- { dietary, room_pref, allergies, notes }
  total_stays INTEGER DEFAULT 0,
  total_spend DECIMAL(10,2) DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_guests_property ON guests(property_id);
CREATE INDEX idx_guests_email ON guests(property_id, email);
CREATE INDEX idx_guests_name ON guests(property_id, last_name, first_name);

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id),
  room_type_id UUID NOT NULL REFERENCES room_types(id),
  room_id UUID REFERENCES rooms(id),
  -- Can be assigned later
  confirmation_code TEXT UNIQUE NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  num_guests INTEGER DEFAULT 1,
  status booking_status DEFAULT 'pending',
  source booking_source DEFAULT 'direct',
  nightly_rate DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  stripe_payment_id TEXT,
  special_requests TEXT,
  internal_notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (check_out > check_in),
  CHECK (num_guests >= 1),
  CHECK (total_amount >= 0)
);

CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_dates ON bookings(property_id, check_in, check_out, status);
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_confirmation ON bookings(confirmation_code);
CREATE INDEX idx_bookings_status ON bookings(property_id, status);

-- Prevent overlapping bookings on the same physical room
-- This is the critical constraint that prevents double bookings at the DB level
ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_room_bookings
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in, check_out) WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'no_show') AND room_id IS NOT NULL);

-- ============================================================
-- MESSAGES
-- ============================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES guests(id),
  channel message_channel NOT NULL,
  direction message_direction DEFAULT 'outbound',
  template_id TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  status message_status DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  -- External IDs, delivery receipts, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_property ON messages(property_id);
CREATE INDEX idx_messages_booking ON messages(booking_id);
CREATE INDEX idx_messages_guest ON messages(guest_id);
CREATE INDEX idx_messages_status ON messages(property_id, status);

-- ============================================================
-- MESSAGE TEMPLATES
-- ============================================================

CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  trigger message_trigger NOT NULL,
  channel message_channel NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  -- Supports {{guest_name}}, {{check_in}}, {{check_out}}, {{room_type}},
  -- {{confirmation_code}}, {{total_amount}}, {{property_name}}, {{property_phone}}
  send_offset_hours INTEGER DEFAULT 0,
  -- Negative = before event, Positive = after event
  -- e.g. -48 = 48 hours before check-in
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_templates_property ON message_templates(property_id);

-- ============================================================
-- STAFF MEMBERS
-- ============================================================

CREATE TABLE staff_members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role staff_role DEFAULT 'receptionist',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staff_property ON staff_members(property_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON room_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON rate_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON staff_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CONFIRMATION CODE GENERATOR
-- ============================================================

CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  -- Excluded: I, O, 0, 1 (avoid confusion)
  result TEXT := 'AR-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate confirmation code on booking insert
CREATE OR REPLACE FUNCTION set_confirmation_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmation_code IS NULL OR NEW.confirmation_code = '' THEN
    LOOP
      NEW.confirmation_code := generate_confirmation_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM bookings WHERE confirmation_code = NEW.confirmation_code
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_confirmation_code
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_confirmation_code();

-- ============================================================
-- GUEST STATS UPDATE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_guest_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'checked_out' AND (OLD.status IS NULL OR OLD.status != 'checked_out') THEN
    UPDATE guests
    SET
      total_stays = total_stays + 1,
      total_spend = total_spend + NEW.total_amount
    WHERE id = NEW.guest_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guest_stats_on_checkout
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_stats();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Staff can only see their property's data
CREATE POLICY "Staff see own property" ON properties
  FOR ALL USING (
    id IN (SELECT property_id FROM staff_members WHERE id = auth.uid())
  );

CREATE POLICY "Staff see own property room types" ON room_types
  FOR ALL USING (
    property_id IN (SELECT property_id FROM staff_members WHERE id = auth.uid())
  );

CREATE POLICY "Staff see own property rooms" ON rooms
  FOR ALL USING (
    property_id IN (SELECT property_id FROM staff_members WHERE id = auth.uid())
  );

CREATE POLICY "Staff see own property rate periods" ON rate_periods
  FOR ALL USING (
    property_id IN (SELECT property_id FROM staff_members WHERE id = auth.uid())
  );

CREATE POLICY "Staff see own property guests" ON guests
  FOR ALL USING (
    property_id IN (SELECT property_id FROM staff_members WHERE id = auth.uid())
  );

CREATE POLICY "Staff see own property bookings" ON bookings
  FOR ALL USING (
    property_id IN (SELECT property_id FROM staff_members WHERE id = auth.uid())
  );

CREATE POLICY "Staff see own property messages" ON messages
  FOR ALL USING (
    property_id IN (SELECT property_id FROM staff_members WHERE id = auth.uid())
  );

CREATE POLICY "Staff see own property templates" ON message_templates
  FOR ALL USING (
    property_id IN (SELECT property_id FROM staff_members WHERE id = auth.uid())
  );

CREATE POLICY "Staff see own record" ON staff_members
  FOR ALL USING (
    property_id IN (SELECT property_id FROM staff_members WHERE id = auth.uid())
  );

-- Public read access for booking engine (guests checking availability)
CREATE POLICY "Public read active properties" ON properties
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read active room types" ON room_types
  FOR SELECT USING (is_active = true);

-- Public can read bookings by confirmation code (for guest self-service)
CREATE POLICY "Public read booking by confirmation" ON bookings
  FOR SELECT USING (true);
  -- Note: Edge Function handles actual auth via confirmation code lookup

-- ============================================================
-- AVAILABILITY CHECK FUNCTION
-- ============================================================
-- This function returns available room types for a given date range
-- It's the core query that powers the booking engine

CREATE OR REPLACE FUNCTION check_availability(
  p_property_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_guests INTEGER DEFAULT 1
)
RETURNS TABLE (
  room_type_id UUID,
  room_type_name TEXT,
  description TEXT,
  base_rate DECIMAL,
  effective_rate DECIMAL,
  max_occupancy INTEGER,
  amenities TEXT[],
  images TEXT[],
  bed_config JSONB,
  total_rooms INTEGER,
  booked_rooms BIGINT,
  available_rooms BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id AS room_type_id,
    rt.name AS room_type_name,
    rt.description,
    rt.base_rate,
    -- Get the most specific rate period override, or fall back to base_rate
    COALESCE(
      (SELECT rp.rate FROM rate_periods rp
       WHERE rp.property_id = p_property_id
         AND (rp.room_type_id = rt.id OR rp.room_type_id IS NULL)
         AND rp.start_date <= p_check_in
         AND rp.end_date >= p_check_out
         AND rp.is_active = true
       ORDER BY rp.room_type_id NULLS LAST  -- Specific room type rate takes priority
       LIMIT 1),
      rt.base_rate
    ) AS effective_rate,
    rt.max_occupancy,
    rt.amenities,
    rt.images,
    rt.bed_config,
    -- Total physical rooms of this type
    (SELECT COUNT(*) FROM rooms r
     WHERE r.room_type_id = rt.id
       AND r.status != 'maintenance'
       AND r.status != 'blocked')::INTEGER AS total_rooms,
    -- Rooms already booked for overlapping dates
    (SELECT COUNT(DISTINCT b.room_id) FROM bookings b
     WHERE b.room_type_id = rt.id
       AND b.property_id = p_property_id
       AND b.status NOT IN ('cancelled', 'no_show')
       AND b.room_id IS NOT NULL
       AND b.check_in < p_check_out
       AND b.check_out > p_check_in) AS booked_rooms,
    -- Available = total - booked
    (SELECT COUNT(*) FROM rooms r
     WHERE r.room_type_id = rt.id
       AND r.status NOT IN ('maintenance', 'blocked'))
    -
    (SELECT COUNT(DISTINCT b.room_id) FROM bookings b
     WHERE b.room_type_id = rt.id
       AND b.property_id = p_property_id
       AND b.status NOT IN ('cancelled', 'no_show')
       AND b.room_id IS NOT NULL
       AND b.check_in < p_check_out
       AND b.check_out > p_check_in) AS available_rooms
  FROM room_types rt
  WHERE rt.property_id = p_property_id
    AND rt.is_active = true
    AND rt.max_occupancy >= p_guests
  ORDER BY rt.sort_order, rt.base_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DEFAULT MESSAGE TEMPLATES FUNCTION
-- ============================================================
-- Called when a new property is created to seed default templates

CREATE OR REPLACE FUNCTION create_default_templates(p_property_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO message_templates (property_id, trigger, channel, name, subject, body, send_offset_hours) VALUES
  (p_property_id, 'booking_confirmed', 'email', 'Booking Confirmation',
   'Your Booking is Confirmed — {{confirmation_code}}',
   'Dear {{guest_name}},

Thank you for booking with {{property_name}}!

Your reservation details:
• Confirmation Code: {{confirmation_code}}
• Room: {{room_type}}
• Check-in: {{check_in}}
• Check-out: {{check_out}}
• Total: {{total_amount}}

If you have any questions or special requests, please don''t hesitate to contact us.

We look forward to welcoming you!

Warm regards,
{{property_name}}
{{property_phone}}', 0),

  (p_property_id, 'pre_arrival', 'email', 'Pre-Arrival Message',
   'We''re Looking Forward to Your Stay — {{confirmation_code}}',
   'Dear {{guest_name}},

Your stay at {{property_name}} is just around the corner!

A quick reminder:
• Check-in: {{check_in}} from {{check_in_time}}
• Confirmation Code: {{confirmation_code}}

Is there anything we can arrange before your arrival? Just reply to this email.

See you soon!

{{property_name}}', -48),

  (p_property_id, 'post_stay', 'email', 'Post-Stay Thank You',
   'Thank You for Staying with Us!',
   'Dear {{guest_name}},

Thank you for choosing {{property_name}}. We hope you had a wonderful stay!

We''d love to hear about your experience. Your feedback helps us improve and helps future guests make their decision.

We hope to welcome you back soon.

Warm regards,
{{property_name}}', 24),

  (p_property_id, 'cancellation', 'email', 'Cancellation Confirmation',
   'Booking Cancelled — {{confirmation_code}}',
   'Dear {{guest_name}},

Your booking ({{confirmation_code}}) at {{property_name}} has been cancelled.

If this was a mistake or you''d like to rebook, please contact us:
{{property_phone}}

We hope to welcome you another time.

{{property_name}}', 0),

  (p_property_id, 'check_in_reminder', 'sms', 'Check-in Reminder SMS',
   NULL,
   'Hi {{guest_name}}! Just a reminder — you''re checking in to {{property_name}} tomorrow. Check-in from {{check_in_time}}. See you soon! Ref: {{confirmation_code}}', -24);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DONE!
-- ============================================================
-- Run: npx supabase db push
-- Then generate types: npx supabase gen types typescript > src/types/database.ts
