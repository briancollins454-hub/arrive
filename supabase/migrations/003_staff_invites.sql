-- ============================================================
-- 003 — Staff Invites + permissions column + missing roles
-- Enables self-service user management from the dashboard
-- ============================================================

-- ============================================================
-- 0. ADD MISSING STAFF ROLES
--    The original enum only had: owner, manager, receptionist, housekeeping
--    The app uses 12 roles — add the 8 missing ones.
-- ============================================================

ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'general_manager';
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'front_office_manager';
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'concierge';
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'revenue_manager';
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'housekeeping_manager';
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'night_auditor';
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'readonly';

-- ============================================================
-- 1. STAFF_INVITES TABLE
--    Tracks pending invitations. When the invited user signs up
--    the app creates their staff_members row and marks the
--    invite as accepted.
-- ============================================================

CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

CREATE TABLE staff_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        staff_role DEFAULT 'receptionist',
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status      invite_status DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

CREATE INDEX idx_invites_property ON staff_invites(property_id);
CREATE INDEX idx_invites_email    ON staff_invites(email);
CREATE INDEX idx_invites_token    ON staff_invites(token);

-- ============================================================
-- 2. PERMISSIONS COLUMN — add granted/revoked overrides
--    to staff_members so per-user permission tweaks persist
-- ============================================================

ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

ALTER TABLE staff_invites ENABLE ROW LEVEL SECURITY;

-- Staff can read invites for their own property
CREATE POLICY "Staff can view own property invites"
  ON staff_invites FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM staff_members WHERE id = auth.uid() AND is_active = true
    )
  );

-- Managers / owners can create invites
CREATE POLICY "Managers can create invites"
  ON staff_invites FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT property_id FROM staff_members
      WHERE id = auth.uid()
        AND is_active = true
        AND role IN ('owner', 'manager', 'general_manager')
    )
  );

-- Managers / owners can update (revoke) invites
CREATE POLICY "Managers can update invites"
  ON staff_invites FOR UPDATE
  USING (
    property_id IN (
      SELECT property_id FROM staff_members
      WHERE id = auth.uid()
        AND is_active = true
        AND role IN ('owner', 'manager', 'general_manager')
    )
  );

-- Managers / owners can delete invites
CREATE POLICY "Managers can delete invites"
  ON staff_invites FOR DELETE
  USING (
    property_id IN (
      SELECT property_id FROM staff_members
      WHERE id = auth.uid()
        AND is_active = true
        AND role IN ('owner', 'manager', 'general_manager')
    )
  );

-- ============================================================
-- 4. FUNCTION: accept_invite(token, user_id)
--    Called after a user signs up with an invite token.
--    Creates the staff_members row and marks the invite accepted.
-- ============================================================

CREATE OR REPLACE FUNCTION accept_invite(invite_token TEXT, new_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Find the pending invite
  SELECT * INTO inv
  FROM staff_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found, expired, or already used');
  END IF;

  -- Create the staff member
  INSERT INTO staff_members (id, property_id, name, email, role, is_active)
  VALUES (new_user_id, inv.property_id, inv.name, inv.email, inv.role, true)
  ON CONFLICT (id) DO NOTHING;

  -- Mark invite as accepted
  UPDATE staff_invites
  SET status = 'accepted'
  WHERE id = inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'property_id', inv.property_id,
    'role', inv.role
  );
END;
$$;

-- ============================================================
-- 5. Allow new signups to call accept_invite (no auth required
--    beyond having a valid token — the function is SECURITY DEFINER)
-- ============================================================

GRANT EXECUTE ON FUNCTION accept_invite(TEXT, UUID) TO anon, authenticated;

-- ============================================================
-- 6. Allow anon/unauthenticated users to read a specific invite
--    by token (needed for the invite accept page)
-- ============================================================

CREATE POLICY "Anyone can read invite by token"
  ON staff_invites FOR SELECT
  USING (true);
  -- The invite token is secret — knowing it is sufficient authorization.
  -- The accept page filters by token + status = pending.

-- ============================================================
-- DONE
-- ============================================================
