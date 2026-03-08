-- ============================================================
-- 008 · City Ledger Invoices table
-- Stores invoices created when charges are transferred from a
-- guest folio to a city-ledger (company) account.
-- ============================================================

CREATE TABLE IF NOT EXISTS city_ledger_invoices (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES city_ledger_accounts(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  booking_confirmation TEXT,
  guest_name      TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  date_posted     TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  status          TEXT NOT NULL DEFAULT 'outstanding'
                    CHECK (status IN ('outstanding','partially_paid','paid','overdue','written_off')),
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by account and property
CREATE INDEX IF NOT EXISTS idx_cli_account ON city_ledger_invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_cli_property ON city_ledger_invoices(property_id);

-- RLS
ALTER TABLE city_ledger_invoices ENABLE ROW LEVEL SECURITY;

-- SELECT: staff members of the same property
CREATE POLICY "city_ledger_invoices_select"
  ON city_ledger_invoices FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM staff_members WHERE user_id = auth.uid()
    )
  );

-- INSERT
CREATE POLICY "city_ledger_invoices_insert"
  ON city_ledger_invoices FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT property_id FROM staff_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY "city_ledger_invoices_update"
  ON city_ledger_invoices FOR UPDATE
  USING (
    property_id IN (
      SELECT property_id FROM staff_members WHERE user_id = auth.uid()
    )
  );

-- DELETE
CREATE POLICY "city_ledger_invoices_delete"
  ON city_ledger_invoices FOR DELETE
  USING (
    property_id IN (
      SELECT property_id FROM staff_members WHERE user_id = auth.uid()
    )
  );
