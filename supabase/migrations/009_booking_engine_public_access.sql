-- ============================================================
-- 009 — Public read access for booking engine
-- Allow unauthenticated visitors to read rooms, rate_periods,
-- and room_types so the booking engine can show availability.
-- ============================================================

-- Rooms: public visitors need to see room counts per type for availability
CREATE POLICY "Public read rooms for availability" ON rooms
  FOR SELECT USING (true);

-- Rate periods: public visitors need seasonal pricing
CREATE POLICY "Public read active rate periods" ON rate_periods
  FOR SELECT USING (is_active = true);

-- ============================================================
-- RPC: get_availability
-- Returns available room types for a property + date range.
-- Used by the booking engine in live (non-demo) mode.
-- Runs as SECURITY DEFINER so it can read all tables regardless
-- of caller auth level.
-- ============================================================

CREATE OR REPLACE FUNCTION get_availability(
  p_property_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_guests INTEGER DEFAULT 1
)
RETURNS JSONB[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB[];
  rec RECORD;
BEGIN
  result := ARRAY[]::JSONB[];

  FOR rec IN
    SELECT
      rt.id AS room_type_id,
      rt.name,
      rt.description,
      rt.base_rate,
      rt.max_occupancy,
      rt.amenities,
      rt.images,
      rt.bed_config,
      -- Count sellable rooms (not maintenance/blocked)
      count(r.id) FILTER (
        WHERE r.status NOT IN ('maintenance', 'blocked')
      ) AS total_rooms,
      -- Count rooms blocked by overlapping bookings
      count(r.id) FILTER (
        WHERE r.status NOT IN ('maintenance', 'blocked')
          AND r.id IN (
            SELECT b.room_id FROM bookings b
            WHERE b.room_type_id = rt.id
              AND b.room_id IS NOT NULL
              AND b.status NOT IN ('cancelled', 'no_show', 'checked_out')
              AND b.check_in < p_check_out
              AND b.check_out > p_check_in
          )
      ) AS booked_rooms,
      -- Best active rate for the period (if any seasonal rate applies)
      (
        SELECT rp.rate FROM rate_periods rp
        WHERE rp.property_id = p_property_id
          AND (rp.room_type_id = rt.id OR rp.room_type_id IS NULL)
          AND rp.is_active = true
          AND rp.start_date <= p_check_in
          AND rp.end_date >= p_check_out
        ORDER BY rp.room_type_id NULLS LAST, rp.rate ASC
        LIMIT 1
      ) AS seasonal_rate
    FROM room_types rt
    LEFT JOIN rooms r ON r.room_type_id = rt.id AND r.property_id = p_property_id
    WHERE rt.property_id = p_property_id
      AND rt.is_active = true
      AND rt.max_occupancy >= p_guests
    GROUP BY rt.id, rt.name, rt.description, rt.base_rate,
             rt.max_occupancy, rt.amenities, rt.images, rt.bed_config, rt.sort_order
    ORDER BY rt.sort_order, rt.base_rate
  LOOP
    -- Only include if there are available rooms
    IF rec.total_rooms - rec.booked_rooms > 0 THEN
      result := array_append(result, jsonb_build_object(
        'room_type_id', rec.room_type_id,
        'name', rec.name,
        'description', rec.description,
        'base_rate', rec.base_rate,
        'rate', coalesce(rec.seasonal_rate, rec.base_rate),
        'max_occupancy', rec.max_occupancy,
        'amenities', rec.amenities,
        'images', rec.images,
        'bed_config', rec.bed_config,
        'available_rooms', rec.total_rooms - rec.booked_rooms,
        'total_rooms', rec.total_rooms
      ));
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_availability(UUID, DATE, DATE, INTEGER) TO anon, authenticated;

-- ============================================================
-- DONE
-- ============================================================
