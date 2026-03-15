// app/api/devices/pair/route.ts
// POST /api/devices/pair  — authenticated
// Creates a device record + generates a short-lived pairing code.
// The admin copies the code and gives it to whoever sets up the kiosk.

import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const getUserBusinessId = async (
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
) => {
  const { data: userBusiness } = await supabase
    .from('user_businesses')
    .select('business_id')
    .eq('user_id', userId)
    .single()
  return userBusiness?.business_id || null
}

/** Generates a code like ALLY-7B3K (avoids ambiguous chars 0/O, 1/I) */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  const array = new Uint8Array(4)
  // Node crypto — secure random
  crypto.getRandomValues(array)
  for (let i = 0; i < array.length; i++) {
    suffix += chars[array[i] % chars.length]
  }
  return `ALLY-${suffix}`
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = new TextEncoder().encode(
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret'
    )
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { site_id, device_name, device_type = 'kiosk' } = body ?? {}

    if (!site_id || !device_name?.trim()) {
      return NextResponse.json(
        { error: 'site_id and device_name are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const businessId = await getUserBusinessId(supabase, userId)

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Verify the site belongs to this business
    const { data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('id', site_id)
      .eq('business_id', businessId)
      .single()

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // 1. Create the device record (status = 'pairing' until redeemed)
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .insert({
        business_id: businessId,
        site_id,
        device_name: device_name.trim(),
        device_type,
        status: 'offline',
      })
      .select('*')
      .single()

    if (deviceError || !device) {
      console.error('Error creating device:', deviceError)
      return NextResponse.json({ error: 'Failed to create device' }, { status: 500 })
    }

    // 2. Generate a unique pairing code (retry on collision)
    let code = generateCode()
    let attempts = 0
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('device_pairing_codes')
        .select('id')
        .eq('code', code)
        .maybeSingle()
      if (!existing) break
      code = generateCode()
      attempts++
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 h

    const { data: pairingRecord, error: codeError } = await supabase
      .from('device_pairing_codes')
      .insert({
        code,
        device_id: device.id,
        site_id,
        business_id: businessId,
        expires_at: expiresAt,
      })
      .select('*')
      .single()

    if (codeError || !pairingRecord) {
      console.error('Error creating pairing code:', codeError)
      // Clean up the device we just created
      await supabase.from('devices').delete().eq('id', device.id)
      // Surface the real DB error in development so it is easy to diagnose
      const detail = codeError?.message ?? 'Unknown error'
      const hint = detail.includes('does not exist')
        ? ' — make sure you have run CREATE-MISSING-TABLES.sql in Supabase'
        : ''
      return NextResponse.json(
        { error: `Failed to generate pairing code: ${detail}${hint}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      device,
      pairing_code: code,
      expires_at: expiresAt,
    })
  } catch (error: any) {
    console.error('Unexpected error in pair generate:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
