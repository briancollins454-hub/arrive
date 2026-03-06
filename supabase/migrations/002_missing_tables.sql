-- ============================================================
-- ARRIVÉ — Missing Tables & Columns
-- Migration: 002_missing_tables.sql
-- Adds: folio_entries, activity_log, notifications tables
--        + housekeeping_status column on rooms
-- ============================================================

-- ============================================================
-- HOUSEKEEPING STATUS on ROOMS
-- ============================================================

CREATE TYPE housekeeping_status AS ENUM (
  'clean', 'dirty', 'inspected', 'serviced', 'service_refused', 'out_of_order'
);

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS housekeeping_status housekeeping_status DEFAULT 'clean';

-- ============================================================
-- FOLIO ENTRIES (charges, payments, refunds)
-- ============================================================

CREATE TYPE folio_entry_type AS ENUM ('charge', 'payment', 'refund', 'adjustment');
CREATE TYPE folio_charge_category AS ENUM (
  'room', 'food', 'beverage', 'spa', 'laundry', 'parking',
  'phone', 'damage', 'tax', 'discount', 'city_ledger', 'other'
);
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer', 'online', 'other');

CREATE TABLE folio_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type folio_entry_type NOT NULL DEFAULT 'charge',
  category folio_charge_category NOT NULL DEFAULT 'room',
  description TEXT NOT NULL DEFAULT '',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method payment_method,
  posted_by TEXT NOT NULL DEFAULT 'System',
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_voided BOOLEAN NOT NULL DEFAULT false,
  voided_by TEXT,
  voided_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_folio_booking ON folio_entries(booking_id);
CREATE INDEX idx_folio_posted ON folio_entries(posted_at);
CREATE INDEX idx_folio_type ON folio_entries(type);

-- RLS
ALTER TABLE folio_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff see own property folios" ON folio_entries
  FOR ALL USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      WHERE b.property_id IN (
        SELECT property_id FROM staff_members WHERE id = auth.uid()
      )
    )
  );

-- ============================================================
-- ACTIVITY LOG
-- ============================================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  performed_by TEXT NOT NULL DEFAULT 'System',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_property ON activity_log(property_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff see own property activity" ON activity_log
  FOR ALL USING (
    property_id IN (SELECT property_id FROM staff_members WHERE id = auth.uid())
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_property ON notifications(property_id);
CREATE INDEX idx_notifications_unread ON notifications(property_id, is_read) WHERE is_read = false;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff see own property notifications" ON notifications
  FOR ALL USING (
    property_id IN (SELECT property_id FROM staff_members WHERE id = auth.uid())
  );

-- ============================================================
-- UPDATED_AT TRIGGERS for new tables (where applicable)
-- ============================================================
-- folio_entries, activity_log, notifications only have created_at (immutable logs)
-- so no updated_at trigger needed.

-- ============================================================
-- DONE
-- ============================================================
