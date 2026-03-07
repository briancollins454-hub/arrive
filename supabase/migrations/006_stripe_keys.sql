-- ============================================================
-- Migration 006 — Stripe API keys per property
-- ============================================================
-- Adds columns to store each hotel's Stripe publishable key
-- and secret key so payments flow to the hotel's own account.
-- ============================================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
  ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT;

-- The stripe_account_id column already exists from migration 001.
-- These new columns let each property supply their own Stripe keys
-- without relying on a global env-var.

COMMENT ON COLUMN properties.stripe_publishable_key IS 'Hotel Stripe publishable (pk_live/pk_test) key';
COMMENT ON COLUMN properties.stripe_secret_key     IS 'Hotel Stripe secret (sk_live/sk_test) key — read only by edge functions';
