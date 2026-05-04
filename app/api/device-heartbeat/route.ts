// app/api/device-heartbeat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    const body = await request.json()
    const { device_id, paired_device_id, going_offline, site_id, business_id, page_url, device_info, user_agent } = body

    const now = new Date().toISOString()

    // Update the paired device record in the `devices` table (admin-facing).
    // This is the primary heartbeat path for properly paired kiosk tablets.
    if (paired_device_id && typeof paired_device_id === 'string') {
      const { error: devErr } = await supabase
        .from('devices')
        .update({
          status: going_offline ? 'offline' : 'online',
          last_heartbeat: now,
          updated_at: now,
        })
        .eq('id', paired_device_id)

      if (devErr) {
        console.error('[device-heartbeat] devices update error:', devErr)
        return NextResponse.json({ error: devErr.message }, { status: 500 })
      }
    }

    // Also maintain the legacy kiosk_devices table if a fingerprint device_id is present.
    if (device_id && typeof device_id === 'string') {
      const { data: device } = await supabase
        .from('kiosk_devices')
        .select('id')
        .eq('device_id', device_id)
        .single()

      if (device) {
        // Update existing record
        await supabase
          .from('kiosk_devices')
          .update({
            is_online: !going_offline,
            last_heartbeat: now,
            updated_at: now,
            ...(device_info ? { device_info } : {}),
            ...(user_agent ? { user_agent } : {}),
          })
          .eq('device_id', device_id)

        // Log heartbeat
        if (!going_offline && page_url) {
          await supabase
            .from('device_heartbeats')
            .insert({
              device_id: device.id,
              timestamp: now,
              page_url: String(page_url).slice(0, 500),
            })
        }
      } else if (site_id && typeof site_id === 'string' && !going_offline) {
        // Create new unpaired device record — happens on first heartbeat from a
        // WebView-based kiosk (e.g. FreeKiosk) where localStorage pairing is absent.
        const { data: newDevice } = await supabase
          .from('kiosk_devices')
          .insert({
            device_id,
            site_id,
            ...(business_id ? { business_id } : {}),
            device_name: `Kiosk ${device_id.slice(-8)}`,
            device_type: 'kiosk',
            is_online: true,
            last_heartbeat: now,
            first_seen: now,
            updated_at: now,
            ...(device_info ? { device_info } : {}),
            ...(user_agent ? { user_agent } : {}),
          })
          .select('id')
          .single()

        if (newDevice && page_url) {
          await supabase
            .from('device_heartbeats')
            .insert({
              device_id: newDevice.id,
              timestamp: now,
              page_url: String(page_url).slice(0, 500),
            })
        }
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
