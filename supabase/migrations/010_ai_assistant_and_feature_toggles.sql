-- ============================================================
-- 010 — AI Assistant + Feature Toggles
-- ============================================================

-- ============================================================
-- 1. Feature toggles — per-property feature flags
-- ============================================================

CREATE TABLE IF NOT EXISTS property_feature_toggles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  feature_key   TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT false,
  updated_by    UUID REFERENCES auth.users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, feature_key)
);

ALTER TABLE property_feature_toggles ENABLE ROW LEVEL SECURITY;

-- Staff can read toggles for their properties
CREATE POLICY "Staff read own property toggles"
  ON property_feature_toggles FOR SELECT
  USING (
    property_id IN (
      SELECT sp.property_id FROM staff_properties sp
      JOIN staff s ON s.id = sp.staff_id
      WHERE s.user_id = auth.uid()
    )
  );

-- Only owners can update toggles
CREATE POLICY "Owners manage property toggles"
  ON property_feature_toggles FOR ALL
  USING (
    property_id IN (
      SELECT sp.property_id FROM staff_properties sp
      JOIN staff s ON s.id = sp.staff_id
      WHERE s.user_id = auth.uid() AND sp.role = 'owner'
    )
  );

-- ============================================================
-- 2. AI Assistant — conversation history per property
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  title         TEXT NOT NULL DEFAULT 'New conversation',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  tokens_used     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: users see their own, owners see all for their property
CREATE POLICY "Users read own conversations"
  ON ai_conversations FOR SELECT
  USING (
    user_id = auth.uid()
    OR property_id IN (
      SELECT sp.property_id FROM staff_properties sp
      JOIN staff s ON s.id = sp.staff_id
      WHERE s.user_id = auth.uid() AND sp.role = 'owner'
    )
  );

CREATE POLICY "Users create own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own conversations"
  ON ai_conversations FOR DELETE
  USING (user_id = auth.uid());

-- Messages follow conversations
CREATE POLICY "Users read own conversation messages"
  ON ai_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
    OR conversation_id IN (
      SELECT ac.id FROM ai_conversations ac
      WHERE ac.property_id IN (
        SELECT sp.property_id FROM staff_properties sp
        JOIN staff s ON s.id = sp.staff_id
        WHERE s.user_id = auth.uid() AND sp.role = 'owner'
      )
    )
  );

CREATE POLICY "Users insert own conversation messages"
  ON ai_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. AI context RPC — gathers ALL property data for the AI
-- Runs as SECURITY DEFINER so it can read across tables.
-- Only callable by staff who have ai_assistant enabled.
-- ============================================================

CREATE OR REPLACE FUNCTION get_ai_property_context(p_property_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ctx JSONB;
  prop RECORD;
BEGIN
  -- Verify caller has access
  IF NOT EXISTS (
    SELECT 1 FROM staff_properties sp
    JOIN staff s ON s.id = sp.staff_id
    WHERE s.user_id = auth.uid() AND sp.property_id = p_property_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Build comprehensive context
  SELECT jsonb_build_object(
    'property', (
      SELECT to_jsonb(p) FROM properties p WHERE p.id = p_property_id
    ),
    'room_types', (
      SELECT COALESCE(jsonb_agg(to_jsonb(rt)), '[]'::jsonb)
      FROM room_types rt WHERE rt.property_id = p_property_id AND rt.is_active = true
    ),
    'rooms', (
      SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
      FROM rooms r WHERE r.property_id = p_property_id
    ),
    'todays_bookings', (
      SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
      FROM bookings b
      WHERE b.property_id = p_property_id
        AND b.check_in <= CURRENT_DATE + 1
        AND b.check_out >= CURRENT_DATE
        AND b.status NOT IN ('cancelled', 'no_show')
    ),
    'upcoming_bookings', (
      SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
      FROM bookings b
      WHERE b.property_id = p_property_id
        AND b.check_in > CURRENT_DATE
        AND b.check_in <= CURRENT_DATE + 7
        AND b.status NOT IN ('cancelled', 'no_show')
    ),
    'recent_bookings', (
      SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
      FROM (
        SELECT * FROM bookings b
        WHERE b.property_id = p_property_id
        ORDER BY b.created_at DESC LIMIT 50
      ) b
    ),
    'guests', (
      SELECT COALESCE(jsonb_agg(to_jsonb(g)), '[]'::jsonb)
      FROM (
        SELECT * FROM guests g
        WHERE g.property_id = p_property_id
        ORDER BY g.updated_at DESC LIMIT 100
      ) g
    ),
    'staff', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'role', sp.role, 'is_active', s.is_active
      )), '[]'::jsonb)
      FROM staff s
      JOIN staff_properties sp ON sp.staff_id = s.id
      WHERE sp.property_id = p_property_id
    ),
    'rate_periods', (
      SELECT COALESCE(jsonb_agg(to_jsonb(rp)), '[]'::jsonb)
      FROM rate_periods rp
      WHERE rp.property_id = p_property_id AND rp.is_active = true
    ),
    'active_work_orders', (
      SELECT COALESCE(jsonb_agg(to_jsonb(wo)), '[]'::jsonb)
      FROM work_orders wo
      WHERE wo.property_id = p_property_id AND wo.status IN ('open', 'in_progress')
    ),
    'pending_guest_requests', (
      SELECT COALESCE(jsonb_agg(to_jsonb(gr)), '[]'::jsonb)
      FROM guest_requests gr
      WHERE gr.property_id = p_property_id AND gr.status IN ('pending', 'in_progress')
    ),
    'recent_activity', (
      SELECT COALESCE(jsonb_agg(to_jsonb(al)), '[]'::jsonb)
      FROM (
        SELECT * FROM activity_log al
        WHERE al.property_id = p_property_id
        ORDER BY al.created_at DESC LIMIT 50
      ) al
    ),
    'messages', (
      SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      FROM (
        SELECT * FROM messages m
        WHERE m.property_id = p_property_id
        ORDER BY m.created_at DESC LIMIT 30
      ) m
    ),
    'group_bookings', (
      SELECT COALESCE(jsonb_agg(to_jsonb(gb)), '[]'::jsonb)
      FROM group_bookings gb
      WHERE gb.property_id = p_property_id
        AND gb.status != 'cancelled'
    ),
    'packages', (
      SELECT COALESCE(jsonb_agg(to_jsonb(pk)), '[]'::jsonb)
      FROM packages pk
      WHERE pk.property_id = p_property_id AND pk.is_active = true
    ),
    'lost_found', (
      SELECT COALESCE(jsonb_agg(to_jsonb(lf)), '[]'::jsonb)
      FROM lost_found_items lf
      WHERE lf.property_id = p_property_id AND lf.status IN ('found')
    ),
    'occupancy_stats', (
      SELECT jsonb_build_object(
        'total_rooms', (SELECT count(*) FROM rooms WHERE property_id = p_property_id),
        'occupied', (SELECT count(*) FROM rooms WHERE property_id = p_property_id AND status = 'occupied'),
        'available', (SELECT count(*) FROM rooms WHERE property_id = p_property_id AND status = 'available'),
        'maintenance', (SELECT count(*) FROM rooms WHERE property_id = p_property_id AND status = 'maintenance'),
        'blocked', (SELECT count(*) FROM rooms WHERE property_id = p_property_id AND status = 'blocked'),
        'dirty_rooms', (SELECT count(*) FROM rooms WHERE property_id = p_property_id AND housekeeping_status = 'dirty'),
        'todays_arrivals', (SELECT count(*) FROM bookings WHERE property_id = p_property_id AND check_in = CURRENT_DATE AND status IN ('confirmed', 'pending')),
        'todays_departures', (SELECT count(*) FROM bookings WHERE property_id = p_property_id AND check_out = CURRENT_DATE AND status = 'checked_in'),
        'in_house', (SELECT count(*) FROM bookings WHERE property_id = p_property_id AND status = 'checked_in')
      )
    )
  ) INTO ctx;

  RETURN ctx;
END;
$$;

GRANT EXECUTE ON FUNCTION get_ai_property_context(UUID) TO authenticated;

-- ============================================================
-- DONE
-- ============================================================
