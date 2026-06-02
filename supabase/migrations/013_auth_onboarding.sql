-- ============================================================
-- 013 — Production-ready auth & onboarding
--
-- Goals:
--   1. accept_invite() also links staff_properties (multi-property
--      login relies on this junction) and seeds permissions.
--   2. Add a platform_admins allowlist + is_platform_admin() helper
--      so the platform admin can onboard hotels (server-side via
--      the service role, with a client-side RLS safety net).
--   3. Standardize "manager-capable" roles to the roles the app
--      actually uses (owner, general_manager, front_office_manager),
--      replacing references to the legacy unused `manager` role.
--   4. Allow invites to be re-issued (token + expiry regenerated).
--
-- This migration is idempotent and safe to re-run.
-- ============================================================

-- ============================================================
-- 1. PLATFORM ADMINS
--    The accounts allowed to onboard new hotels. Seeded with the
--    address configured in VITE_PLATFORM_ADMIN_EMAIL.
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_admins (
  email      TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_admins (email)
VALUES ('brian@thesupportsdesk.com')
ON CONFLICT (email) DO NOTHING;

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Helper: is the current authenticated user a platform admin?
-- SECURITY DEFINER so it can read platform_admins regardless of RLS.
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

GRANT EXECUTE ON FUNCTION is_platform_admin() TO anon, authenticated;

-- Platform admins can read the allowlist (e.g. to gate the admin UI).
DROP POLICY IF EXISTS "Platform admins read allowlist" ON platform_admins;
CREATE POLICY "Platform admins read allowlist"
  ON platform_admins FOR SELECT
  USING (is_platform_admin());

-- ============================================================
-- 2. PLATFORM ADMIN RLS SAFETY NET
--    Let platform admins create/read any property and any invite
--    directly (the edge functions use the service role and bypass
--    RLS, but this makes the system robust if called client-side).
-- ============================================================

DROP POLICY IF EXISTS "Platform admins manage properties" ON properties;
CREATE POLICY "Platform admins manage properties"
  ON properties FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "Platform admins manage invites" ON staff_invites;
CREATE POLICY "Platform admins manage invites"
  ON staff_invites FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================
-- 3. STANDARDIZE MANAGER-CAPABLE ROLES ON staff_invites
--    Replace ('owner','manager','general_manager') with the roles
--    the app actually uses for managing staff.
-- ============================================================

DROP POLICY IF EXISTS "Managers can create invites" ON staff_invites;
CREATE POLICY "Managers can create invites"
  ON staff_invites FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT property_id FROM staff_members
      WHERE id = auth.uid()
        AND is_active = true
        AND role IN ('owner', 'general_manager', 'front_office_manager')
    )
  );

DROP POLICY IF EXISTS "Managers can update invites" ON staff_invites;
CREATE POLICY "Managers can update invites"
  ON staff_invites FOR UPDATE
  USING (
    property_id IN (
      SELECT property_id FROM staff_members
      WHERE id = auth.uid()
        AND is_active = true
        AND role IN ('owner', 'general_manager', 'front_office_manager')
    )
  );

DROP POLICY IF EXISTS "Managers can delete invites" ON staff_invites;
CREATE POLICY "Managers can delete invites"
  ON staff_invites FOR DELETE
  USING (
    property_id IN (
      SELECT property_id FROM staff_members
      WHERE id = auth.uid()
        AND is_active = true
        AND role IN ('owner', 'general_manager', 'front_office_manager')
    )
  );

-- ============================================================
-- 4. STANDARDIZE MANAGER-CAPABLE ROLES ON staff_properties
-- ============================================================

DROP POLICY IF EXISTS staff_properties_manage ON staff_properties;
CREATE POLICY staff_properties_manage ON staff_properties
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.id = auth.uid()
        AND staff_members.role IN ('owner', 'general_manager', 'front_office_manager')
        AND staff_members.property_id = staff_properties.property_id
    )
  );

-- ============================================================
-- 5. RE-ISSUE INVITE
--    Regenerates the token + extends expiry and resets status to
--    pending. Used by the "resend invite" action. SECURITY DEFINER
--    with an explicit authorization check.
-- ============================================================

CREATE OR REPLACE FUNCTION reissue_invite(invite_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inv         RECORD;
  new_token   TEXT;
  is_admin    BOOLEAN := is_platform_admin();
  is_manager  BOOLEAN;
BEGIN
  SELECT * INTO inv FROM staff_invites WHERE id = invite_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  -- Authorization: platform admin OR a manager of the invite's property
  SELECT EXISTS (
    SELECT 1 FROM staff_members
    WHERE id = auth.uid()
      AND is_active = true
      AND property_id = inv.property_id
      AND role IN ('owner', 'general_manager', 'front_office_manager')
  ) INTO is_manager;

  IF NOT (is_admin OR is_manager) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  new_token := encode(gen_random_bytes(32), 'hex');

  UPDATE staff_invites
  SET token = new_token,
      status = 'pending',
      expires_at = now() + INTERVAL '7 days'
  WHERE id = invite_id;

  RETURN jsonb_build_object('success', true, 'token', new_token);
END;
$$;

GRANT EXECUTE ON FUNCTION reissue_invite(UUID) TO authenticated;

-- ============================================================
-- 6. REWRITE accept_invite()
--    Creates the staff_members row AND the staff_properties link
--    (is_primary = true) so multi-property login resolves cleanly.
--    Idempotent: safe to call more than once for the same user.
-- ============================================================

CREATE OR REPLACE FUNCTION accept_invite(invite_token TEXT, new_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT * INTO inv
  FROM staff_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    -- If this user already accepted (idempotent retry), report success.
    IF EXISTS (SELECT 1 FROM staff_members WHERE id = new_user_id) THEN
      RETURN jsonb_build_object(
        'success', true,
        'property_id', (SELECT property_id FROM staff_members WHERE id = new_user_id),
        'already_accepted', true
      );
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found, expired, or already used');
  END IF;

  -- 1. Create the staff member (primary property = the invite's property)
  INSERT INTO staff_members (id, property_id, name, email, role, is_active, permissions)
  VALUES (new_user_id, inv.property_id, inv.name, inv.email, inv.role, true, '{}'::jsonb)
  ON CONFLICT (id) DO UPDATE
    SET property_id = EXCLUDED.property_id,
        name        = EXCLUDED.name,
        email       = EXCLUDED.email,
        role        = EXCLUDED.role,
        is_active   = true;

  -- 2. Link the staff member to the property (multi-property junction)
  INSERT INTO staff_properties (staff_id, property_id, role, is_primary)
  VALUES (new_user_id, inv.property_id, inv.role, true)
  ON CONFLICT (staff_id, property_id) DO UPDATE
    SET role = EXCLUDED.role,
        is_primary = true;

  -- 3. Mark invite accepted
  UPDATE staff_invites SET status = 'accepted' WHERE id = inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'property_id', inv.property_id,
    'role', inv.role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION accept_invite(TEXT, UUID) TO anon, authenticated;

-- ============================================================
-- DONE
-- ============================================================
