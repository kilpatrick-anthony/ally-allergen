// app/api/device-heartbeat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    const body = await request.json()
    const { device_id, paired_device_id, going_offline } = body

    const now = new Date().toISOString()

    // Update the paired device record in the `devices` table (admin-facing).
    // This is the primary heartbeat path for properly paired kiosk tablets.
    if (paired_device_id && typeof paired_device_id === 'string') {
      await supabase
        .from('devices')
        .update({
          status: going_offline ? 'offline' : 'online',
          last_heartbeat: now,
          updated_at: now,
        })
        .eq('id', paired_device_id)
    }

    // Also maintain the legacy kiosk_devices table if a fingerprint device_id is present.
    if (device_id && typeof device_id === 'string') {
      const { data: device } = await supabase
        .from('kiosk_devices')
        .select('id')
        .eq('device_id', device_id)
        .single()

      if (device) {
        await supabase
          .from('kiosk_devices')
          .update({
            is_online: !going_offline,
            last_heartbeat: now,
            updated_at: now,
          })
          .eq('device_id', device_id)
      }
    }

    if (!paired_device_id && !device_id) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal error' 
    }, { status: 500 })
  }
}
