-- ============================================================
-- 014 — Backfill staff_properties for existing staff
--
-- Migration 013 made accept_invite() create the staff_properties
-- junction row going forward, but staff that were created BEFORE
-- 013 may be missing their link. Multi-property login / property
-- resolution relies on staff_properties, so backfill any staff
-- member that has no link, and guarantee every staff member has
-- exactly one primary property.
--
-- Idempotent and safe to re-run.
-- ============================================================

-- 1. Create a primary link for any staff member missing one entirely.
INSERT INTO staff_properties (staff_id, property_id, role, is_primary)
SELECT sm.id, sm.property_id, sm.role, true
FROM staff_members sm
WHERE NOT EXISTS (
  SELECT 1 FROM staff_properties sp WHERE sp.staff_id = sm.id
)
ON CONFLICT (staff_id, property_id) DO NOTHING;

-- 2. For staff that have links but none flagged primary, promote
--    their earliest link to primary.
UPDATE staff_properties sp
SET is_primary = true
WHERE sp.id = (
  SELECT s2.id FROM staff_properties s2
  WHERE s2.staff_id = sp.staff_id
  ORDER BY s2.created_at NULLS LAST
  LIMIT 1
)
AND sp.staff_id IN (
  SELECT staff_id FROM staff_properties
  GROUP BY staff_id
  HAVING bool_or(is_primary) = false
);
