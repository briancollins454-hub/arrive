-- ============================================================
-- ARRIVÉ — Multi-Property / Group Support
-- Migration: 002_multi_property.sql
-- ============================================================

-- ============================================================
-- STAFF → PROPERTY ACCESS (junction table)
-- Allows one staff member to access multiple properties
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  role staff_role NOT NULL DEFAULT 'receptionist',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each staff member can only be linked once per property
  UNIQUE (staff_id, property_id)
);

-- Index for fast lookups: "which properties can this staff member access?"
CREATE INDEX idx_staff_properties_staff ON staff_properties(staff_id);
-- Index for fast lookups: "which staff have access to this property?"
CREATE INDEX idx_staff_properties_property ON staff_properties(property_id);

-- ============================================================
-- BACKFILL: link existing staff to their current property
-- ============================================================

INSERT INTO staff_properties (staff_id, property_id, role, is_primary)
SELECT id, property_id, role, true
FROM staff_members
WHERE NOT EXISTS (
  SELECT 1 FROM staff_properties sp WHERE sp.staff_id = staff_members.id AND sp.property_id = staff_members.property_id
);

-- ============================================================
-- RLS POLICY: staff can only see properties they have access to
-- ============================================================

-- Enable RLS on staff_properties
ALTER TABLE staff_properties ENABLE ROW LEVEL SECURITY;

-- Staff can read their own property assignments
CREATE POLICY staff_properties_select ON staff_properties
  FOR SELECT
  USING (staff_id = auth.uid());

-- Owners / GMs can manage property assignments
CREATE POLICY staff_properties_manage ON staff_properties
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.id = auth.uid()
        AND staff_members.role IN ('owner', 'manager')
        AND staff_members.property_id = staff_properties.property_id
    )
  );

-- Allow staff to insert their own property links (e.g. when creating a new property)
CREATE POLICY staff_properties_self_insert ON staff_properties
  FOR INSERT
  WITH CHECK (staff_id = auth.uid());

-- ============================================================
-- VIEW: convenient join for fetching staff with all their properties
-- ============================================================

CREATE OR REPLACE VIEW staff_with_properties AS
SELECT
  s.id AS staff_id,
  s.name AS staff_name,
  s.email AS staff_email,
  sp.property_id,
  p.name AS property_name,
  p.slug AS property_slug,
  sp.role,
  sp.is_primary
FROM staff_members s
JOIN staff_properties sp ON sp.staff_id = s.id
JOIN properties p ON p.id = sp.property_id
WHERE s.is_active = true
ORDER BY sp.is_primary DESC, p.name ASC;
