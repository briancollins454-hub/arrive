-- ============================================================
-- 004 — Fix RLS infinite recursion on staff_members
--
-- The original RLS policies on staff_members reference staff_members
-- in their own USING clause, causing infinite recursion (500 errors).
-- Fix: create a SECURITY DEFINER function that bypasses RLS to
-- look up the user's property_id, then use it in all policies.
-- ============================================================

-- 1. Create helper function (SECURITY DEFINER = bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_property_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT property_id FROM staff_members WHERE id = auth.uid() LIMIT 1
$$;

-- 2. Drop ALL existing policies that use the broken subquery pattern

-- From 001_initial_schema.sql
DROP POLICY IF EXISTS "Staff see own property"          ON properties;
DROP POLICY IF EXISTS "Staff see own property room types" ON room_types;
DROP POLICY IF EXISTS "Staff see own property rooms"    ON rooms;
DROP POLICY IF EXISTS "Staff see own property rate periods" ON rate_periods;
DROP POLICY IF EXISTS "Staff see own property guests"   ON guests;
DROP POLICY IF EXISTS "Staff see own property bookings" ON bookings;
DROP POLICY IF EXISTS "Staff see own property messages" ON messages;
DROP POLICY IF EXISTS "Staff see own property templates" ON message_templates;
DROP POLICY IF EXISTS "Staff see own record"            ON staff_members;

-- From 002_missing_tables.sql
DROP POLICY IF EXISTS "Staff see own property folios"   ON folio_entries;
DROP POLICY IF EXISTS "Staff see own property activity" ON activity_log;
DROP POLICY IF EXISTS "Staff see own property notifications" ON notifications;

-- 3. Re-create all policies using the helper function

CREATE POLICY "Staff see own property" ON properties
  FOR ALL USING (id = get_my_property_id());

CREATE POLICY "Staff see own property room types" ON room_types
  FOR ALL USING (property_id = get_my_property_id());

CREATE POLICY "Staff see own property rooms" ON rooms
  FOR ALL USING (property_id = get_my_property_id());

CREATE POLICY "Staff see own property rate periods" ON rate_periods
  FOR ALL USING (property_id = get_my_property_id());

CREATE POLICY "Staff see own property guests" ON guests
  FOR ALL USING (property_id = get_my_property_id());

CREATE POLICY "Staff see own property bookings" ON bookings
  FOR ALL USING (property_id = get_my_property_id());

CREATE POLICY "Staff see own property messages" ON messages
  FOR ALL USING (property_id = get_my_property_id());

CREATE POLICY "Staff see own property templates" ON message_templates
  FOR ALL USING (property_id = get_my_property_id());

CREATE POLICY "Staff see own record" ON staff_members
  FOR ALL USING (property_id = get_my_property_id());

CREATE POLICY "Staff see own property folios" ON folio_entries
  FOR ALL USING (
    booking_id IN (SELECT id FROM bookings WHERE property_id = get_my_property_id())
  );

CREATE POLICY "Staff see own property activity" ON activity_log
  FOR ALL USING (property_id = get_my_property_id());

CREATE POLICY "Staff see own property notifications" ON notifications
  FOR ALL USING (property_id = get_my_property_id());

-- ============================================================
-- DONE — all RLS policies now use the SECURITY DEFINER function
-- instead of self-referential subqueries.
-- ============================================================
