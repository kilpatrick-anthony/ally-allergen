// app/api/device-heartbeat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // This endpoint handles heartbeats sent via sendBeacon during page unload
    const body = await request.json()
    const { device_id, going_offline } = body

    if (!device_id) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 })
    }

    // Get device
    const { data: device } = await supabase
      .from('kiosk_devices')
      .select('id')
      .eq('device_id', device_id)
      .single()

    if (device && going_offline) {
      // Update last heartbeat but don't mark as offline yet
      // The scheduled function will handle that
      await supabase
        .from('kiosk_devices')
        .update({
          last_heartbeat: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('device_id', device_id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal error' 
    }, { status: 500 })
  }
}
