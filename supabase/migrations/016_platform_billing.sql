-- ============================================================
-- 016 — Platform billing & subscriptions
--
-- The platform (Arrivé / The Supports Desk) charges each hotel a
-- monthly subscription via the PLATFORM Stripe account. This is
-- separate from each hotel's own Stripe keys (which they use to
-- take GUEST payments and live in property_secrets).
--
--   subscription_plans   — the catalogue (Boutique/Independent/...).
--   hotel_subscriptions  — one row per property, synced from Stripe.
--   billing_events       — audit log of processed Stripe webhooks.
--
-- Idempotent and safe to re-run.
-- ============================================================

-- ----------------------------------------------------------------
-- Status enum
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'trialing', 'active', 'past_due', 'canceled', 'suspended', 'incomplete'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- Plan catalogue
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
  code                TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  monthly_price_pence INTEGER NOT NULL,
  room_min            INTEGER,
  room_max            INTEGER,
  stripe_price_id     TEXT,
  is_addon            BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER NOT NULL DEFAULT 0
);

-- Seed plans (prices mirror the public pricing page).
INSERT INTO subscription_plans (code, name, monthly_price_pence, room_min, room_max, is_addon, sort_order) VALUES
  ('boutique',    'Boutique',    14900, 11,  50,   false, 1),
  ('independent', 'Independent', 24900, 51,  100,  false, 2),
  ('portfolio',   'Portfolio',   34900, 101, NULL, false, 3),
  ('ai_addon',    'Arrivé AI',    4000, NULL, NULL, true,  4)
ON CONFLICT (code) DO UPDATE SET
  name                = EXCLUDED.name,
  monthly_price_pence = EXCLUDED.monthly_price_pence,
  room_min            = EXCLUDED.room_min,
  room_max            = EXCLUDED.room_max,
  is_addon            = EXCLUDED.is_addon,
  sort_order          = EXCLUDED.sort_order;

-- ----------------------------------------------------------------
-- Per-hotel subscription (synced from Stripe)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hotel_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  plan_code             TEXT REFERENCES subscription_plans(code),
  status                subscription_status NOT NULL DEFAULT 'trialing',
  ai_addon              BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  current_period_end    TIMESTAMPTZ,
  grace_until           TIMESTAMPTZ,
  trial_ends_at         TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotel_subscriptions_property ON hotel_subscriptions(property_id);
CREATE INDEX IF NOT EXISTS idx_hotel_subscriptions_customer ON hotel_subscriptions(stripe_customer_id);

-- ----------------------------------------------------------------
-- Webhook audit log
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  stripe_event_id TEXT UNIQUE,
  type            TEXT,
  payload         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------
ALTER TABLE subscription_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events      ENABLE ROW LEVEL SECURITY;

-- Plans: anyone authenticated may read the catalogue; only admins write.
DROP POLICY IF EXISTS sp_read ON subscription_plans;
CREATE POLICY sp_read ON subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS sp_admin_write ON subscription_plans;
CREATE POLICY sp_admin_write ON subscription_plans FOR ALL
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- Subscriptions: platform admin manages all; active staff of a property
-- may READ their own property's subscription (needed for the billing gate).
DROP POLICY IF EXISTS hs_admin ON hotel_subscriptions;
CREATE POLICY hs_admin ON hotel_subscriptions FOR ALL
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS hs_staff_read ON hotel_subscriptions;
CREATE POLICY hs_staff_read ON hotel_subscriptions FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM staff_members
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Billing events: platform admin only (service role bypasses RLS).
DROP POLICY IF EXISTS be_admin ON billing_events;
CREATE POLICY be_admin ON billing_events FOR ALL
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- ----------------------------------------------------------------
-- Backfill: give every existing property a trialing subscription row
-- so the admin dashboard and billing gate have something to read.
-- ----------------------------------------------------------------
INSERT INTO hotel_subscriptions (property_id, status, trial_ends_at)
SELECT p.id, 'trialing', now() + INTERVAL '30 days'
FROM properties p
WHERE NOT EXISTS (SELECT 1 FROM hotel_subscriptions hs WHERE hs.property_id = p.id);

-- ----------------------------------------------------------------
-- Every new property automatically gets a 30-day trial subscription.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_hotel_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO hotel_subscriptions (property_id, status, trial_ends_at)
  VALUES (NEW.id, 'trialing', now() + INTERVAL '30 days')
  ON CONFLICT (property_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ensure_hotel_subscription ON properties;
CREATE TRIGGER trg_ensure_hotel_subscription AFTER INSERT ON properties
FOR EACH ROW EXECUTE FUNCTION ensure_hotel_subscription();

-- ============================================================
-- DONE
-- ============================================================
