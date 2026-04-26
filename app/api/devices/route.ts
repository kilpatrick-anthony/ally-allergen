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

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
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

    const searchParams = request.nextUrl.searchParams
    const siteId = searchParams.get('siteId')

    let query = supabase
      .from('devices')
      .select('*, site:sites(id, name, slug, city), business:businesses(slug)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    const { data: devices, error } = await query

    if (error) {
      console.error('Error fetching devices:', error)
      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
    }

    // Attach the latest active (non-redeemed, non-expired) pairing code to each device
    const now = new Date().toISOString()
    const deviceIds = (devices || []).map((d: any) => d.id)
    let pairingByDevice: Record<string, { code: string; expires_at: string; redeemed: boolean | null }> = {}

    if (deviceIds.length > 0) {
      const { data: codes, error: codesError } = await supabase
        .from('device_pairing_codes')
        .select('device_id, code, expires_at, redeemed')
        .in('device_id', deviceIds)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })

      if (codesError) {
        console.warn('Pairing code query with created_at ordering failed, falling back:', codesError.message)
        const { data: fallbackCodes } = await supabase
          .from('device_pairing_codes')
          .select('device_id, code, expires_at, redeemed')
          .in('device_id', deviceIds)
          .gt('expires_at', now)
          .order('expires_at', { ascending: false })

        for (const row of fallbackCodes ?? []) {
          if (!pairingByDevice[row.device_id]) {
            pairingByDevice[row.device_id] = {
              code: row.code,
              expires_at: row.expires_at,
              redeemed: row.redeemed ?? null,
            }
          }
        }
      } else {
        for (const row of codes ?? []) {
          // Keep only the most recent code per device (already sorted desc)
          if (!pairingByDevice[row.device_id]) {
            pairingByDevice[row.device_id] = {
              code: row.code,
              expires_at: row.expires_at,
              redeemed: row.redeemed ?? null,
            }
          }
        }
      }
    }

    const devicesWithCodes = (devices || []).map((d: any) => ({
      ...d,
      active_pairing_code: pairingByDevice[d.id]?.code ?? null,
      pairing_code_expires_at: pairingByDevice[d.id]?.expires_at ?? null,
      active_pairing_code_redeemed: pairingByDevice[d.id]?.redeemed ?? null,
    }))

    return NextResponse.json({ devices: devicesWithCodes })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body?.site_id || !body?.device_name) {
      return NextResponse.json({ error: 'Site and name are required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const businessId = await getUserBusinessId(supabase, userId)

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: device, error } = await supabase
      .from('devices')
      .insert({
        business_id: businessId,
        site_id: body.site_id,
        device_name: body.device_name,
        device_type: body.device_type || 'kiosk',
        status: body.status || 'offline',
        ip_address: body.ip_address || null,
        user_agent: body.user_agent || null
      })
      .select('*, site:sites(id, name, slug, city)')
      .single()

    if (error) {
      console.error('Error creating device:', error)
      return NextResponse.json({ error: 'Failed to create device' }, { status: 500 })
    }

    return NextResponse.json({ device })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
