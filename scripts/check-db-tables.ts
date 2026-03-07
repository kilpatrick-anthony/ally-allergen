// scripts/check-db-tables.ts
// Quick script to check what tables exist in your Supabase database

import { createClient } from '@supabase/supabase-js'

// Hardcode credentials for this quick check
const supabaseUrl = 'https://lxvunfmmucciejrruojy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dnVuZm1tdWNjaWVqcnJ1b2p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk5OTkxNywiZXhwIjoyMDgyNTc1OTE3fQ.dzkMzwsIj_hR7lkDTRHBnaVnRFIM0oXq77O6VJfLyUo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  console.log('\n🔍 Checking database tables...\n')

  const tablesToCheck = [
    'businesses',
    'sites',
    'ingredients',
    'menu_items',
    'allergens',
    'datasheets',
    'datasheet_review_reminders',
    'kiosk_devices',
    'device_offline_alerts',
    'device_heartbeats',
    'suppliers'
  ]

  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`❌ ${table}: Does not exist or no access`)
        console.log(`   Error: ${error.message}`)
      } else {
        console.log(`✅ ${table}: Exists (${count} rows)`)
      }
    } catch (err) {
      console.log(`❌ ${table}: Error - ${err}`)
    }
  }

  console.log('\n✨ Database check complete!\n')
}

checkTables()
