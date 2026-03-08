-- ============================================================
-- ARRIVÉ — City Ledger Accounts
-- Migration: 007_city_ledger_accounts.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS city_ledger_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_terms INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE city_ledger_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view city ledger accounts for their property"
  ON city_ledger_accounts FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM staff_members WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert city ledger accounts for their property"
  ON city_ledger_accounts FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT property_id FROM staff_members WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can update city ledger accounts for their property"
  ON city_ledger_accounts FOR UPDATE
  USING (
    property_id IN (
      SELECT property_id FROM staff_members WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can delete city ledger accounts for their property"
  ON city_ledger_accounts FOR DELETE
  USING (
    property_id IN (
      SELECT property_id FROM staff_members WHERE id = auth.uid()
    )
  );
