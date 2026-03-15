// app/api/devices/[id]/pair/route.ts
// POST /api/devices/[id]/pair  — authenticated
// Invalidates any existing active pairing codes for the device and
// issues a fresh one. Used when the admin needs to re-pair a kiosk.

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

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  const array = new Uint8Array(4)
  crypto.getRandomValues(array)
  for (let i = 0; i < array.length; i++) {
    suffix += chars[array[i] % chars.length]
  }
  return `ALLY-${suffix}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deviceId } = await params

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

    const supabase = createServiceClient()
    const businessId = await getUserBusinessId(supabase, userId)

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Confirm the device belongs to this business
    const { data: device } = await supabase
      .from('devices')
      .select('id, site_id, business_id')
      .eq('id', deviceId)
      .eq('business_id', businessId)
      .single()

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Expire all existing active codes for this device
    await supabase
      .from('device_pairing_codes')
      .update({ expires_at: new Date().toISOString() })
      .eq('device_id', deviceId)
      .eq('redeemed', false)

    // Generate a new unique code
    let code = generateCode()
    for (let attempts = 0; attempts < 5; attempts++) {
      const { data: existing } = await supabase
        .from('device_pairing_codes')
        .select('id')
        .eq('code', code)
        .maybeSingle()
      if (!existing) break
      code = generateCode()
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data: pairingRecord, error: codeError } = await supabase
      .from('device_pairing_codes')
      .insert({
        code,
        device_id: deviceId,
        site_id: device.site_id,
        business_id: businessId,
        expires_at: expiresAt,
      })
      .select('*')
      .single()

    if (codeError || !pairingRecord) {
      console.error('Error generating pairing code:', codeError)
      return NextResponse.json(
        { error: `Failed to generate pairing code: ${codeError?.message ?? 'Unknown error'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ pairing_code: code, expires_at: expiresAt })
  } catch (error: any) {
    console.error('Unexpected error in pair regenerate:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
