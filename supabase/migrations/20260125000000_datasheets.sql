-- Version normalized from the legacy remote ID 20260125.
-- Product Datasheet Management System
-- Allows uploading and tracking of product datasheets for ingredients and menu items

CREATE TABLE IF NOT EXISTS datasheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- File Information
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Storage path (e.g., Supabase Storage path)
  file_size BIGINT, -- Size in bytes
  file_type TEXT, -- MIME type (e.g., 'application/pdf')
  
  -- Associated Entity
  entity_type TEXT NOT NULL CHECK (entity_type IN ('ingredient', 'menu_item')),
  entity_id INTEGER NOT NULL, -- ID of the ingredient or menu item
  
  -- Metadata
  uploaded_by UUID, -- References auth.users(id)
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Review Tracking
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  last_reviewed_by UUID, -- References auth.users(id)
  review_notes TEXT,
  next_review_date DATE, -- When this datasheet should be reviewed again
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'expired')),
  
  -- Additional Info
  supplier_name TEXT,
  version TEXT, -- Version of the datasheet (e.g., 'v2.1', '2024-Q1')
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasheets_entity ON datasheets(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_datasheets_status ON datasheets(status);
CREATE INDEX IF NOT EXISTS idx_datasheets_next_review ON datasheets(next_review_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_datasheets_uploaded_by ON datasheets(uploaded_by);

CREATE TABLE IF NOT EXISTS datasheet_review_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datasheet_id UUID REFERENCES datasheets(id) ON DELETE CASCADE,
  
  -- Reminder Settings
  reminder_date DATE NOT NULL,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Recipients
  recipient_emails TEXT[], -- Array of email addresses to notify
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_date ON datasheet_review_reminders(reminder_date, reminder_sent);
CREATE INDEX IF NOT EXISTS idx_reminders_datasheet ON datasheet_review_reminders(datasheet_id);

CREATE OR REPLACE FUNCTION get_datasheets_needing_review(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  datasheet_id UUID,
  file_name TEXT,
  entity_type TEXT,
  entity_id INTEGER,
  next_review_date DATE,
  days_until_review INTEGER,
  supplier_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as datasheet_id,
    d.file_name,
    d.entity_type,
    d.entity_id,
    d.next_review_date,
    (d.next_review_date - CURRENT_DATE) as days_until_review,
    d.supplier_name
  FROM datasheets d
  WHERE d.status = 'active'
    AND d.next_review_date IS NOT NULL
    AND d.next_review_date <= CURRENT_DATE + days_ahead
    AND d.next_review_date >= CURRENT_DATE
  ORDER BY d.next_review_date ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_ingredient_datasheets_cascade(p_ingredient_id INTEGER)
RETURNS TABLE (
  datasheet_id UUID,
  file_name TEXT,
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  source TEXT -- 'direct' or 'menu_item'
) AS $$
BEGIN
  RETURN QUERY
  -- Direct datasheets for the ingredient
  SELECT 
    d.id as datasheet_id,
    d.file_name,
    d.file_path,
    d.file_size,
    d.file_type,
    d.uploaded_at,
    'direct'::TEXT as source
  FROM datasheets d
  WHERE d.entity_type = 'ingredient'
    AND d.entity_id = p_ingredient_id
    AND d.status = 'active';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW datasheet_summary AS
SELECT 
  d.id,
  d.file_name,
  d.file_size,
  d.file_type,
  d.entity_type,
  d.entity_id,
  d.uploaded_at,
  d.last_reviewed_at,
  d.next_review_date,
  d.status,
  d.supplier_name,
  d.version,
  CASE 
    WHEN d.next_review_date < CURRENT_DATE THEN 'overdue'
    WHEN d.next_review_date <= CURRENT_DATE + 7 THEN 'due_soon'
    ELSE 'up_to_date'
  END as review_status,
  (d.next_review_date - CURRENT_DATE) as days_until_review
FROM datasheets d
WHERE d.status = 'active'
ORDER BY d.uploaded_at DESC;

CREATE OR REPLACE FUNCTION update_datasheets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_datasheets_timestamp
  BEFORE UPDATE ON datasheets
  FOR EACH ROW
  EXECUTE FUNCTION update_datasheets_updated_at();

COMMENT ON TABLE datasheets IS 'Stores product datasheets for ingredients and menu items with review tracking';
COMMENT ON TABLE datasheet_review_reminders IS 'Tracks reminders for datasheet reviews';
