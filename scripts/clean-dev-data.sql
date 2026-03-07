-- Clean Development Data Script
-- Run this in Supabase SQL Editor to remove all Oakberry/mock data
-- This will give you a clean slate for your business

-- ⚠️ WARNING: This will delete all existing data!
-- Only run this if you're ready to start fresh

BEGIN;

-- Delete all menu items (this will cascade to related data)
DELETE FROM menu_items WHERE business_id IN (
  SELECT id FROM businesses WHERE slug LIKE '%oakberry%' OR name LIKE '%Oakberry%'
);

-- Delete all ingredients
DELETE FROM ingredients WHERE business_id IN (
  SELECT id FROM businesses WHERE slug LIKE '%oakberry%' OR name LIKE '%Oakberry%'
);

-- Delete all sites
DELETE FROM sites WHERE slug LIKE '%oakberry%' OR name LIKE '%Oakberry%';

-- Delete kiosk devices
DELETE FROM kiosk_devices;

-- Delete device heartbeats
DELETE FROM device_heartbeats;

-- Delete device offline alerts
DELETE FROM device_offline_alerts;

-- Optional: Update business name (or delete and create new one)
-- Update the business to have your company name
UPDATE businesses 
SET 
  name = 'Your Business Name',  -- Change this to your business name
  slug = 'your-business-slug',  -- Change this to your desired slug (lowercase, no spaces)
  description = 'Your business description',
  updated_at = NOW()
WHERE id = (SELECT id FROM businesses LIMIT 1);

-- Or completely delete the business and let the system create a new one:
-- DELETE FROM businesses;

COMMIT;

-- After running this, you should:
-- 1. Go to Settings in the admin portal
-- 2. Enter your business name and details
-- 3. Go to Sites and create your first location
-- 4. The kiosk URL will be: /kiosk/[your-site-slug]
