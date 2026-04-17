-- ============================================================
-- 012 — Guest Lifecycle: communications, self check-in, preferences
-- ============================================================
-- Adds infrastructure for:
--   • Pre-arrival / post-stay / marketing email tracking
--   • Self check-in flag on bookings
--   • Nothing else — we already have guests.preferences JSONB
-- ============================================================

-- ── guest_communications ─────────────────────────────────────

CREATE TYPE guest_comm_kind AS ENUM (
  'pre_arrival',
  'post_stay_review',
  'marketing',
  'self_checkin_link',
  'custom'
);

CREATE TYPE guest_comm_status AS ENUM (
  'queued',
  'sent',
  'failed',
  'skipped'
);

CREATE TABLE IF NOT EXISTS guest_communications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  guest_id      UUID REFERENCES guests(id) ON DELETE SET NULL,
  kind          guest_comm_kind NOT NULL,
  channel       TEXT NOT NULL DEFAULT 'email',
  status        guest_comm_status NOT NULL DEFAULT 'queued',
  to_email      TEXT,
  subject       TEXT,
  body          TEXT,
  error         TEXT,
  sent_at       TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_comms_property  ON guest_communications(property_id);
CREATE INDEX IF NOT EXISTS idx_guest_comms_booking   ON guest_communications(booking_id);
CREATE INDEX IF NOT EXISTS idx_guest_comms_guest     ON guest_communications(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_comms_status    ON guest_communications(status);
CREATE INDEX IF NOT EXISTS idx_guest_comms_kind_date ON guest_communications(property_id, kind, created_at DESC);

ALTER TABLE guest_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view guest comms"
  ON guest_communications FOR SELECT
  USING (
    property_id IN (
      SELECT sp.property_id FROM staff_properties sp
      WHERE sp.staff_id = auth.uid()
    )
  );

CREATE POLICY "Staff insert guest comms"
  ON guest_communications FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT sp.property_id FROM staff_properties sp
      WHERE sp.staff_id = auth.uid()
    )
  );

CREATE POLICY "Staff update guest comms"
  ON guest_communications FOR UPDATE
  USING (
    property_id IN (
      SELECT sp.property_id FROM staff_properties sp
      WHERE sp.staff_id = auth.uid()
    )
  );

-- ── bookings: self-check-in tracking ────────────────────────

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pre_checkin_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pre_checkin_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_arrival_time TEXT;

-- Allow guests with a valid confirmation_code + last_name to complete
-- online check-in. Exposed as a SECURITY DEFINER RPC so we can validate
-- both identifiers at the database layer — no broad RLS policy needed.

CREATE OR REPLACE FUNCTION public.self_checkin(
  p_slug TEXT,
  p_confirmation_code TEXT,
  p_last_name TEXT,
  p_estimated_arrival_time TEXT DEFAULT NULL,
  p_special_requests TEXT DEFAULT NULL,
  p_checkin_data JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_property_id UUID;
  v_guest guests%ROWTYPE;
BEGIN
  SELECT id INTO v_property_id FROM properties
    WHERE slug = p_slug AND is_active = true;
  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  SELECT b.* INTO v_booking FROM bookings b
    WHERE b.property_id = v_property_id
      AND upper(b.confirmation_code) = upper(p_confirmation_code)
    LIMIT 1;
  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  SELECT g.* INTO v_guest FROM guests g WHERE g.id = v_booking.guest_id;
  IF v_guest.id IS NULL OR lower(v_guest.last_name) <> lower(p_last_name) THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  UPDATE bookings SET
    pre_checkin_completed_at = now(),
    pre_checkin_data = COALESCE(p_checkin_data, '{}'::jsonb),
    estimated_arrival_time = COALESCE(p_estimated_arrival_time, estimated_arrival_time),
    special_requests = COALESCE(
      NULLIF(trim(p_special_requests), ''),
      special_requests
    ),
    updated_at = now()
  WHERE id = v_booking.id;

  RETURN jsonb_build_object(
    'booking_id', v_booking.id,
    'confirmation_code', v_booking.confirmation_code,
    'check_in', v_booking.check_in,
    'check_out', v_booking.check_out,
    'guest_first_name', v_guest.first_name,
    'guest_last_name', v_guest.last_name,
    'property_id', v_property_id
  );
END;
$$;

-- Allow anon (public booking engine visitors) to invoke this function
GRANT EXECUTE ON FUNCTION public.self_checkin(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;

-- Public lookup for booking details on the check-in page (read-only, by code + last name)
CREATE OR REPLACE FUNCTION public.lookup_booking_for_checkin(
  p_slug TEXT,
  p_confirmation_code TEXT,
  p_last_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property properties%ROWTYPE;
  v_booking bookings%ROWTYPE;
  v_guest guests%ROWTYPE;
BEGIN
  SELECT * INTO v_property FROM properties
    WHERE slug = p_slug AND is_active = true;
  IF v_property.id IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  SELECT b.* INTO v_booking FROM bookings b
    WHERE b.property_id = v_property.id
      AND upper(b.confirmation_code) = upper(p_confirmation_code)
    LIMIT 1;
  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  SELECT g.* INTO v_guest FROM guests g WHERE g.id = v_booking.guest_id;
  IF v_guest.id IS NULL OR lower(v_guest.last_name) <> lower(p_last_name) THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  RETURN jsonb_build_object(
    'booking_id', v_booking.id,
    'confirmation_code', v_booking.confirmation_code,
    'check_in', v_booking.check_in,
    'check_out', v_booking.check_out,
    'num_guests', v_booking.num_guests,
    'status', v_booking.status,
    'special_requests', v_booking.special_requests,
    'estimated_arrival_time', v_booking.estimated_arrival_time,
    'pre_checkin_completed_at', v_booking.pre_checkin_completed_at,
    'guest_first_name', v_guest.first_name,
    'guest_last_name', v_guest.last_name,
    'guest_email', v_guest.email,
    'guest_phone', v_guest.phone,
    'property_name', v_property.name,
    'property_check_in_time', (v_property.settings->>'check_in_time')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_booking_for_checkin(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ── property_feature_toggles: seed new keys as NO-OP ─────────
-- New feature keys 'guest_lifecycle' and 'self_checkin' are handled at
-- the application level (default ON). No DB change needed — the toggle
-- table accepts arbitrary string keys.

-- ============================================================
-- DONE
-- ============================================================
