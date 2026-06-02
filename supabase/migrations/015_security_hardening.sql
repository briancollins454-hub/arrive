-- ============================================================
-- 015 — Security hardening (from code analysis)
-- ============================================================
-- Addresses:
--   3.1 / 3.2  Move the Stripe secret key off the publicly-readable
--              `properties` row into the locked-down `property_secrets`
--              table; drop the column entirely.
--   3.1        Tighten property_secrets so secret VALUES are only readable
--              by owners (and edge functions via the service role) — not by
--              every staff member.
--   3.3        Add property_has_secret() so the client can tell whether a
--              secret (Stripe / Claude key) is configured WITHOUT reading
--              its value.
--   3.4        Drop the blanket public SELECT on bookings. Guest-facing
--              lookups already go through the SECURITY DEFINER RPCs in 012.
--   4.1        Replace the legacy 'manager' role reference in the property
--              insert policy with the real manager roles.
--   4.2        Ensure 'reserved' exists on the room_status enum.
--   4.4 / 4.5  create_booking() — one atomic, server-authoritative RPC that
--              creates the guest, booking and folio together, lets the DB
--              trigger own the confirmation code, and prices the stay
--              server-side so a browser can't tamper with it.
-- ============================================================

-- ── 4.2  room_status: make sure 'reserved' is a valid value ──
ALTER TYPE room_status ADD VALUE IF NOT EXISTS 'reserved';

-- ── 3.1  Move existing Stripe secret keys into property_secrets ──
INSERT INTO property_secrets (property_id, secret_key, secret_value)
SELECT id, 'stripe_secret_key', stripe_secret_key
FROM properties
WHERE stripe_secret_key IS NOT NULL AND btrim(stripe_secret_key) <> ''
ON CONFLICT (property_id, secret_key)
DO UPDATE SET secret_value = EXCLUDED.secret_value, updated_at = now();

-- Drop the column so the secret can never again be exposed via a public
-- `select *` on the properties table. The publishable key stays — it is
-- safe to expose.
ALTER TABLE properties DROP COLUMN IF EXISTS stripe_secret_key;

-- ── 3.1  Tighten property_secrets SELECT to owners only ──
-- Previously ALL staff could read every secret value. Now only owners can
-- read (the "Owners manage property secrets" ALL policy covers owner reads),
-- and edge functions read via the service role which bypasses RLS.
DROP POLICY IF EXISTS "Staff read own property secrets" ON property_secrets;

-- ── 3.3  Presence check that any staff member can call safely ──
-- Returns whether a non-empty secret exists for a property the caller is
-- staff of, WITHOUT returning the secret value itself.
CREATE OR REPLACE FUNCTION public.property_has_secret(
  p_property_id UUID,
  p_key TEXT
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM property_secrets ps
      WHERE ps.property_id = p_property_id
        AND ps.secret_key = p_key
        AND coalesce(btrim(ps.secret_value), '') <> ''
    )
    AND (
      EXISTS (
        SELECT 1 FROM staff_properties sp
        WHERE sp.staff_id = auth.uid() AND sp.property_id = p_property_id
      )
      OR EXISTS (
        SELECT 1 FROM staff_members sm
        WHERE sm.id = auth.uid() AND sm.property_id = p_property_id
      )
    );
$$;

-- Only signed-in staff may probe secret presence. anon always gets false
-- anyway (the staff check fails), but revoke the implicit PUBLIC grant so it
-- isn't exposed on the anon REST surface at all.
REVOKE EXECUTE ON FUNCTION public.property_has_secret(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.property_has_secret(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.property_has_secret(UUID, TEXT) TO authenticated;

-- ── 3.4  Remove the blanket public read on bookings ──
DROP POLICY IF EXISTS "Public read booking by confirmation" ON bookings;

-- ── 4.1  Fix the legacy 'manager' role in the property insert policy ──
DROP POLICY IF EXISTS "properties_insert_by_owner" ON properties;
CREATE POLICY "properties_insert_by_owner" ON properties
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.id = auth.uid()
        AND staff_members.role = ANY (ARRAY[
          'owner'::staff_role,
          'general_manager'::staff_role
        ])
    )
  );

-- ============================================================
-- 4.4 / 4.5 / 5.3  Atomic, server-authoritative booking creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_booking(
  p_property_id     UUID,
  p_room_type_id    UUID,
  p_check_in        DATE,
  p_check_out       DATE,
  p_num_guests      INTEGER,
  p_guest           JSONB,
  p_source          TEXT    DEFAULT 'direct',
  p_special_requests TEXT   DEFAULT NULL,
  p_nightly_rate    NUMERIC DEFAULT NULL,
  p_room_id         UUID    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property   properties%ROWTYPE;
  v_guest_id   UUID;
  v_email      TEXT := nullif(btrim(p_guest->>'email'), '');
  v_first      TEXT := btrim(coalesce(p_guest->>'first_name', ''));
  v_last       TEXT := btrim(coalesce(p_guest->>'last_name', ''));
  v_phone      TEXT := nullif(btrim(p_guest->>'phone'), '');
  v_is_staff   BOOLEAN;
  v_rate       NUMERIC;
  v_seasonal   NUMERIC;
  v_nights     INTEGER;
  v_rt_name    TEXT;
  v_booking    bookings%ROWTYPE;
BEGIN
  -- Property must exist and be live
  SELECT * INTO v_property FROM properties
    WHERE id = p_property_id AND is_active = true;
  IF v_property.id IS NULL THEN
    RAISE EXCEPTION 'Property not found or inactive';
  END IF;

  IF v_first = '' OR v_last = '' THEN
    RAISE EXCEPTION 'Guest first and last name are required';
  END IF;
  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Check-out must be after check-in';
  END IF;

  -- Is the caller trusted staff of this property?
  v_is_staff :=
    EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.id = auth.uid() AND sm.property_id = p_property_id AND sm.is_active
    )
    OR EXISTS (
      SELECT 1 FROM staff_properties sp
      WHERE sp.staff_id = auth.uid() AND sp.property_id = p_property_id
    );

  -- Resolve room type + base rate (must belong to this property)
  SELECT name, base_rate INTO v_rt_name, v_rate FROM room_types
    WHERE id = p_room_type_id AND property_id = p_property_id AND is_active = true;
  IF v_rt_name IS NULL THEN
    RAISE EXCEPTION 'Room type not found for this property';
  END IF;

  -- Apply any active seasonal rate covering the whole stay
  SELECT rp.rate INTO v_seasonal FROM rate_periods rp
    WHERE rp.property_id = p_property_id
      AND (rp.room_type_id = p_room_type_id OR rp.room_type_id IS NULL)
      AND rp.is_active = true
      AND rp.start_date <= p_check_in
      AND rp.end_date >= p_check_out
    ORDER BY rp.room_type_id NULLS LAST, rp.rate ASC
    LIMIT 1;

  v_rate := COALESCE(v_seasonal, v_rate);

  -- Only trusted staff may override the computed rate (e.g. negotiated rate).
  -- Public booking-engine visitors always get the server-side price (5.3).
  IF v_is_staff AND p_nightly_rate IS NOT NULL THEN
    v_rate := p_nightly_rate;
  END IF;

  v_nights := GREATEST((p_check_out - p_check_in), 1);

  -- Find or create the guest
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_guest_id FROM guests
      WHERE property_id = p_property_id AND email = v_email
      LIMIT 1;
    IF v_guest_id IS NOT NULL THEN
      UPDATE guests
        SET first_name = v_first,
            last_name  = v_last,
            phone      = COALESCE(v_phone, phone)
        WHERE id = v_guest_id;
    ELSE
      INSERT INTO guests (property_id, first_name, last_name, email, phone)
      VALUES (p_property_id, v_first, v_last, v_email, v_phone)
      RETURNING id INTO v_guest_id;
    END IF;
  ELSE
    INSERT INTO guests (property_id, first_name, last_name, email, phone)
    VALUES (p_property_id, v_first, v_last, NULL, v_phone)
    RETURNING id INTO v_guest_id;
  END IF;

  -- Create the booking. confirmation_code is intentionally omitted so the
  -- DB trigger generates it (single source of truth, no collisions).
  INSERT INTO bookings (
    property_id, guest_id, room_type_id, room_id,
    check_in, check_out, num_guests, source,
    special_requests, nightly_rate, total_amount, status
  )
  VALUES (
    p_property_id, v_guest_id, p_room_type_id, p_room_id,
    p_check_in, p_check_out, GREATEST(coalesce(p_num_guests, 1), 1),
    COALESCE(nullif(btrim(p_source), ''), 'direct')::booking_source,
    nullif(btrim(p_special_requests), ''), v_rate, v_rate * v_nights, 'confirmed'
  )
  RETURNING * INTO v_booking;

  -- Post the room charge to the folio in the SAME transaction (4.5)
  INSERT INTO folio_entries (
    booking_id, type, category, description,
    amount, quantity, unit_price, posted_by, posted_at, is_voided
  )
  VALUES (
    v_booking.id, 'charge', 'room',
    'Room Charge — ' || v_rt_name || ' × ' || v_nights ||
      ' night' || CASE WHEN v_nights <> 1 THEN 's' ELSE '' END,
    v_rate * v_nights, v_nights, v_rate, 'System', now(), false
  );

  RETURN to_jsonb(v_booking);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking(
  UUID, UUID, DATE, DATE, INTEGER, JSONB, TEXT, TEXT, NUMERIC, UUID
) TO anon, authenticated;

-- ============================================================
-- DONE
-- ============================================================
