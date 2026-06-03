-- ============================================================
-- 019 — Align no-overlap booking constraint with deployed DB
-- ============================================================
-- The original constraint in 001_initial_schema.sql excluded only
-- 'cancelled' and 'no_show' bookings from the overlap check. The
-- live database was later refined to ALSO exclude 'checked_out',
-- so that a departed guest's room is immediately free for the next
-- arrival on the same date range.
--
-- This migration brings the repo in line with what is actually
-- deployed, so a rebuild from migration files reproduces the
-- correct (three-status) constraint. It is idempotent and safe to
-- re-run.
--
-- Requires btree_gist (already enabled by 001).
-- ============================================================

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS no_overlapping_room_bookings;

ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_room_bookings
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in, check_out) WITH &&
  )
  WHERE (
    status NOT IN ('cancelled', 'no_show', 'checked_out')
    AND room_id IS NOT NULL
  );

-- ============================================================
-- DONE
-- ============================================================
