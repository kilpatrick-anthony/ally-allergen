CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS kiosk_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL, -- Browser/device fingerprint
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Device Info
  device_name TEXT,
  device_type TEXT DEFAULT 'kiosk', -- 'kiosk', 'tablet', 'display'
  user_agent TEXT,
  ip_address TEXT,
  
  -- Status
  is_online BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metrics
  total_sessions INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  
  -- Metadata
  device_info JSONB, -- Screen size, browser, OS, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_offline_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES kiosk_devices(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  business_id UUID REFERENCES businesses(id),
  
  -- Alert Details
  went_offline_at TIMESTAMP WITH TIME ZONE NOT NULL,
  came_online_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  -- Email Status
  email_sent_to_site BOOLEAN DEFAULT false,
  email_sent_to_admin BOOLEAN DEFAULT false,
  site_email_sent_at TIMESTAMP WITH TIME ZONE,
  admin_email_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES kiosk_devices(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  response_time_ms INTEGER,
  
  -- Optional metrics
  battery_level INTEGER,
  network_type TEXT,
  page_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_kiosk_devices_business ON kiosk_devices(business_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_devices_site ON kiosk_devices(site_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_devices_online ON kiosk_devices(is_online, last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_kiosk_devices_device_id ON kiosk_devices(device_id);

CREATE INDEX IF NOT EXISTS idx_offline_alerts_device ON device_offline_alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_offline_alerts_unresolved ON device_offline_alerts(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_offline_alerts_business ON device_offline_alerts(business_id);

CREATE INDEX IF NOT EXISTS idx_heartbeats_device ON device_heartbeats(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_heartbeats_timestamp ON device_heartbeats(timestamp DESC);

CREATE OR REPLACE FUNCTION check_offline_devices()
RETURNS void AS $$
DECLARE
  offline_threshold INTERVAL := INTERVAL '5 minutes';
  device_record RECORD;
BEGIN
  -- Find devices that haven't sent heartbeat in 5+ minutes
  FOR device_record IN
    SELECT d.*, s.email as site_email, b.contact_email as admin_email, s.name as site_name
    FROM kiosk_devices d
    LEFT JOIN sites s ON d.site_id = s.id
    LEFT JOIN businesses b ON d.business_id = b.id
    WHERE d.is_online = true
      AND d.last_heartbeat < NOW() - offline_threshold
  LOOP
    -- Mark device as offline
    UPDATE kiosk_devices
    SET is_online = false,
        updated_at = NOW()
    WHERE id = device_record.id;
    
    -- Create offline alert record
    INSERT INTO device_offline_alerts (
      device_id,
      site_id,
      business_id,
      went_offline_at
    ) VALUES (
      device_record.id,
      device_record.site_id,
      device_record.business_id,
      NOW()
    );
    
    -- Note: Email sending will be handled by API route
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_device_online(p_device_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE kiosk_devices
  SET is_online = true,
      last_heartbeat = NOW(),
      updated_at = NOW()
  WHERE id = p_device_id;
  
  -- Resolve any open alerts
  UPDATE device_offline_alerts
  SET came_online_at = NOW(),
      duration_minutes = EXTRACT(EPOCH FROM (NOW() - went_offline_at)) / 60,
      resolved = true,
      resolved_at = NOW()
  WHERE device_id = p_device_id
    AND resolved = false;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sites' AND column_name = 'email'
  ) THEN
    ALTER TABLE sites ADD COLUMN email TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE businesses ADD COLUMN contact_email TEXT;
  END IF;
END $$;

CREATE OR REPLACE VIEW device_status_summary AS
SELECT 
  d.id,
  d.device_id,
  d.device_name,
  d.is_online,
  d.last_heartbeat,
  d.total_sessions,
  d.total_interactions,
  s.name as site_name,
  s.email as site_email,
  b.name as business_name,
  b.contact_email as admin_email,
  EXTRACT(EPOCH FROM (NOW() - d.last_heartbeat)) / 60 as minutes_since_heartbeat,
  (SELECT COUNT(*) FROM device_offline_alerts 
   WHERE device_id = d.id AND resolved = false) as active_alerts
FROM kiosk_devices d
LEFT JOIN sites s ON d.site_id = s.id
LEFT JOIN businesses b ON d.business_id = b.id
ORDER BY d.is_online DESC, d.last_heartbeat DESC;
