// scripts/check-suppliers.ts
// Quick script to check suppliers data

import { createClient } from '@supabase/supabase-js'

// Hardcode credentials for this quick check
const supabaseUrl = 'https://lxvunfmmucciejrruojy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dnVuZm1tdWNjaWVqcnJ1b2p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk5OTkxNywiZXhwIjoyMDgyNTc1OTE3fQ.dzkMzwsIj_hR7lkDTRHBnaVnRFIM0oXq77O6VJfLyUo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSuppliers() {
  console.log('\n🔍 Checking suppliers data...\n')

  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')

    if (error) {
      console.log(`❌ Error fetching suppliers: ${error.message}`)
    } else {
      console.log(`✅ Found ${data.length} suppliers:`)
      data.forEach((supplier, index) => {
        console.log(`   ${index + 1}. ${supplier.name} - Status: ${supplier.status} - Business ID: ${supplier.business_id}`)
      })
    }
  } catch (err) {
    console.log(`❌ Error: ${err}`)
  }

  console.log('\n✨ Suppliers check complete!\n')
}

checkSuppliers()