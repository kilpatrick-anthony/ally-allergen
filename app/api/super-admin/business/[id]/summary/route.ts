import { getJwtSecret, hasSuperAdminAccess } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

async function getAuthenticatedSuperAdmin() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth-token')?.value
  if (!authToken) return null

  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string
    const userEmail = payload.email as string
    const userRole = payload.role as string | undefined
    const supabase = createServiceClient()

    const isSuperAdmin = await hasSuperAdminAccess({
      userEmail,
      userRole,
      userId,
      supabase,
    })

    if (!isSuperAdmin) return null
    return { userEmail }
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = createServiceClient()

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', id)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const [sitesResult, devicesResult, eventsResult] = await Promise.all([
      supabase
        .from('sites')
        .select('id, name, slug, address, city, country, eircode, is_active, created_at')
        .eq('business_id', id)
        .order('name'),
      supabase
        .from('devices')
        .select('id, device_name, device_type, status, site_id, last_heartbeat, created_at, site:sites(id, name, slug)')
        .eq('business_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('kiosk_analytics_events')
        .select('id, event_type, site_id, menu_item_id, search_query, created_at')
        .eq('business_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (sitesResult.error) throw sitesResult.error
    if (devicesResult.error) throw devicesResult.error
    if (eventsResult.error) throw eventsResult.error

    const sites = sitesResult.data || []
    const devices = devicesResult.data || []
    const recentActivity = (eventsResult.data || []).map((event: any) => ({
      ...event,
      siteName: sites.find((site: any) => site.id === event.site_id)?.name || null,
    }))

    const siteSummaries = sites.map((site: any) => {
      const siteDevices = devices.filter((device: any) => device.site_id === site.id)
      const onlineDevices = siteDevices.filter((device: any) => device.status === 'online').length
      const lastEvent = recentActivity.find((event: any) => event.site_id === site.id)

      return {
        ...site,
        deviceCount: siteDevices.length,
        onlineDeviceCount: onlineDevices,
        lastActivityAt: lastEvent?.created_at || null,
      }
    })

    return NextResponse.json({
      sites: siteSummaries,
      devices,
      recentActivity,
    })
  } catch (err) {
    console.error('Super admin business summary error:', err)
    return NextResponse.json({ error: 'Failed to load business summary' }, { status: 500 })
  }
}
