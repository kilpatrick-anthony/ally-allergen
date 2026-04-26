// app/api/devices/pair/redeem/route.ts
// POST /api/devices/pair/redeem  — public (no auth)
// The kiosk submits the pairing code; the server verifies it and returns
// the slug + site_id needed to redirect to the correct kiosk page.

import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = (body?.code ?? '').trim().toUpperCase()

    if (!code) {
      return NextResponse.json({ error: 'Pairing code is required' }, { status: 400 })
    }

    // Basic format validation — prevents unnecessary DB round-trips
    if (!/^ALLY-[A-Z2-9]{4}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid pairing code format' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: record, error } = await supabase
      .from('device_pairing_codes')
      .select(`
        id,
        code,
        redeemed,
        expires_at,
        device_id,
        site_id,
        business_id,
        device:devices(id, device_name, device_type),
        business:businesses(id, slug)
      `)
      .eq('code', code)
      .maybeSingle()

    if (error) {
      console.error('Pairing code lookup error:', error)
      return NextResponse.json({ error: 'Failed to look up pairing code' }, { status: 500 })
    }

    if (!record) {
      return NextResponse.json({ error: 'Pairing code not found' }, { status: 404 })
    }

    if (record.redeemed) {
      return NextResponse.json(
        { error: 'This pairing code has already been used' },
        { status: 410 }
      )
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This pairing code has expired' },
        { status: 410 }
      )
    }

    // Mark the code as redeemed
    await supabase
      .from('device_pairing_codes')
      .update({ redeemed: true, redeemed_at: new Date().toISOString() })
      .eq('id', record.id)

    // Mark the device as online
    await supabase
      .from('devices')
      .update({ status: 'online', last_heartbeat: new Date().toISOString() })
      .eq('id', record.device_id)

    const device = Array.isArray(record.device) ? record.device[0] : record.device
    const business = Array.isArray(record.business) ? record.business[0] : record.business
    const kioskTarget = business?.slug || record.business_id

    return NextResponse.json({
      site_id: record.site_id,
      business_id: record.business_id,
      business_slug: business?.slug ?? null,
      kiosk_target: kioskTarget,
      device_id: record.device_id,
      device_name: device?.device_name ?? null,
      device_type: device?.device_type ?? 'kiosk',
    })
  } catch (error: any) {
    console.error('Unexpected error in pair redeem:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
