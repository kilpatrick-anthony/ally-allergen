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

    const siteIds = Array.from(new Set(devicesWithCodes.map((d: any) => d.site_id).filter(Boolean)))
    const liveByPairedDeviceId = new Map<string, {
      last_heartbeat: string | null
      page_url: string | null
      minutes_since_heartbeat: number | null
      is_online: boolean
    }>()

    if (siteIds.length > 0) {
      const { data: liveKioskDevices, error: liveKioskDevicesError } = await supabase
        .from('kiosk_devices')
        .select('id, site_id, is_online, last_heartbeat, device_info')
        .eq('business_id', businessId)
        .in('site_id', siteIds)

      if (liveKioskDevicesError) {
        console.warn('Failed to fetch live kiosk device status:', liveKioskDevicesError.message)
      } else if ((liveKioskDevices || []).length > 0) {
        const kioskDeviceIds = (liveKioskDevices || []).map((row: any) => row.id)

        const { data: recentHeartbeats, error: recentHeartbeatsError } = await supabase
          .from('device_heartbeats')
          .select('device_id, timestamp, page_url')
          .in('device_id', kioskDeviceIds)
          .order('timestamp', { ascending: false })

        if (recentHeartbeatsError) {
          console.warn('Failed to fetch recent device heartbeats:', recentHeartbeatsError.message)
        }

        const latestHeartbeatByKioskDeviceId = new Map<string, { timestamp: string; page_url: string | null }>()
        for (const heartbeat of recentHeartbeats || []) {
          if (!latestHeartbeatByKioskDeviceId.has(heartbeat.device_id)) {
            latestHeartbeatByKioskDeviceId.set(heartbeat.device_id, {
              timestamp: heartbeat.timestamp,
              page_url: heartbeat.page_url ?? null,
            })
          }
        }

        for (const row of liveKioskDevices || []) {
          const pairedDeviceId = String((row as any)?.device_info?.paired_device_id || '').trim()
          if (!pairedDeviceId) continue

          const latestHeartbeat = latestHeartbeatByKioskDeviceId.get(row.id)
          const heartbeatTimestamp = latestHeartbeat?.timestamp || row.last_heartbeat || null
          const minutesSinceHeartbeat = heartbeatTimestamp
            ? (Date.now() - new Date(heartbeatTimestamp).getTime()) / 60000
            : null
          const isOnline = Boolean(row.is_online) && minutesSinceHeartbeat !== null && minutesSinceHeartbeat <= 3

          liveByPairedDeviceId.set(pairedDeviceId, {
            last_heartbeat: heartbeatTimestamp,
            page_url: latestHeartbeat?.page_url ?? null,
            minutes_since_heartbeat: minutesSinceHeartbeat,
            is_online: isOnline,
          })
        }
      }
    }

    const devicesWithLiveStatus = devicesWithCodes.map((d: any) => {
      const live = liveByPairedDeviceId.get(String(d.id))
      const kioskTarget = String(d.business?.slug || d.business_id || '').trim()
      const expectedPath = kioskTarget && d.site_id
        ? `/kiosk/${kioskTarget}`
        : null

      let isOnExpectedScreen = false
      if (live?.page_url && expectedPath) {
        try {
          const pageUrl = new URL(live.page_url, 'http://localhost')
          isOnExpectedScreen = pageUrl.pathname === expectedPath && pageUrl.searchParams.get('site_id') === d.site_id
        } catch {
          isOnExpectedScreen = false
        }
      }

      return {
        ...d,
        status: live ? (live.is_online ? 'online' : 'offline') : d.status,
        last_heartbeat: live?.last_heartbeat ?? d.last_heartbeat,
        live_minutes_since_heartbeat: live?.minutes_since_heartbeat ?? null,
        last_page_url: live?.page_url ?? null,
        is_on_expected_screen: live?.page_url ? isOnExpectedScreen : null,
      }
    })

    return NextResponse.json({ devices: devicesWithLiveStatus })
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
