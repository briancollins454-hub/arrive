-- ============================================================
-- 011 — Property secrets (API keys, credentials)
-- ============================================================
-- Stores sensitive per-property config like API keys.
-- RLS: only owners can read/write, staff with AI access can read.
-- ============================================================

CREATE TABLE IF NOT EXISTS property_secrets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  secret_key    TEXT NOT NULL,
  secret_value  TEXT NOT NULL DEFAULT '',
  updated_by    UUID REFERENCES auth.users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, secret_key)
);

ALTER TABLE property_secrets ENABLE ROW LEVEL SECURITY;

-- Owners can do everything
CREATE POLICY "Owners manage property secrets"
  ON property_secrets FOR ALL
  USING (
    property_id IN (
      SELECT sp.property_id FROM staff_properties sp
      WHERE sp.staff_id = auth.uid() AND sp.role = 'owner'
    )
  );

-- Staff can read (needed so non-owner staff can use AI with the saved key)
CREATE POLICY "Staff read own property secrets"
  ON property_secrets FOR SELECT
  USING (
    property_id IN (
      SELECT sp.property_id FROM staff_properties sp
      WHERE sp.staff_id = auth.uid()
    )
  );

-- ============================================================
-- DONE
-- ============================================================
