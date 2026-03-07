-- ============================================================
-- Migration 005: Add unique constraint on guests(property_id, email)
-- Required for ON CONFLICT upsert when creating bookings
-- ============================================================

-- First deduplicate any existing rows with same (property_id, email)
-- Keep the oldest guest record, update bookings to point to it
DO $$
DECLARE
  dup RECORD;
  keep_id UUID;
BEGIN
  FOR dup IN
    SELECT property_id, email, array_agg(id ORDER BY created_at) AS ids
    FROM guests
    WHERE email IS NOT NULL AND email != ''
    GROUP BY property_id, email
    HAVING count(*) > 1
  LOOP
    keep_id := dup.ids[1];
    -- Point bookings from duplicate guests to the kept guest
    UPDATE bookings SET guest_id = keep_id WHERE guest_id = ANY(dup.ids[2:]);
    -- Delete duplicates
    DELETE FROM guests WHERE id = ANY(dup.ids[2:]);
  END LOOP;
END $$;

-- Now add the unique constraint (partial — only where email is not null/empty)
CREATE UNIQUE INDEX IF NOT EXISTS uq_guests_property_email
  ON guests(property_id, email)
  WHERE email IS NOT NULL AND email != '';
