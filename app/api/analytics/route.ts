// Analytics API
// Tracks business metrics including downloads, kiosk usage, and content counts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

type RangeKey = 'week' | 'month' | 'quarter' | 'year' | '7d' | '30d' | '90d' | '1y'

const rangeToDays: Record<RangeKey, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365
}

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

const percentChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100
  }

  return ((current - previous) / previous) * 100
}

const resolveRange = (range: RangeKey) => {
  const now = new Date()
  const days = rangeToDays[range]
  const durationMs = days * 24 * 60 * 60 * 1000

  const currentStart = new Date(now.getTime() - durationMs)
  const previousEnd = currentStart
  const previousStart = new Date(currentStart.getTime() - durationMs)

  return {
    currentStart,
    currentEnd: now,
    previousStart,
    previousEnd
  }
}

const parseDateParam = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const addDays = (value: Date, days: number) => {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

const countPdfDownloads = async (
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  siteId: string | null,
  start: Date,
  end: Date
) => {
  // Count PDF report downloads from the Downloads & Reports page
  let query = supabase
    .from('pdf_download_events')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())

  if (siteId) {
    query = query.eq('site_id', siteId)
  }

  const { count, error } = await query
  
  if (error) {
    console.warn('PDF download events query error:', error.message)
    return 0
  }

  let kioskDownloadCount = 0
  try {
    let kioskQuery = supabase
      .from('kiosk_analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('event_type', 'download')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    if (siteId) {
      kioskQuery = kioskQuery.eq('site_id', siteId)
    }

    const { count: kioskCount, error: kioskError } = await kioskQuery
    if (!kioskError) {
      kioskDownloadCount = kioskCount || 0
    }
  } catch {
    kioskDownloadCount = 0
  }

  return (count || 0) + kioskDownloadCount
}

const countPairedDevices = async (
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  siteId: string | null
) => {
  let query = supabase
    .from('devices')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
  if (siteId) {
    query = query.eq('site_id', siteId)
  }
  const { count, error } = await query
  if (error) {
    console.warn('countPairedDevices error:', error.message)
    return 0
  }
  return count ?? 0
}

const countKioskInteractions = async (
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  siteId: string | null,
  start: Date,
  end: Date
) => {
  let deviceQuery = supabase
    .from('kiosk_devices')
    .select('id')
    .eq('business_id', businessId)

  if (siteId) {
    deviceQuery = deviceQuery.eq('site_id', siteId)
  }

  const { data: devices, error: devicesError } = await deviceQuery

  if (devicesError) {
    console.warn('Kiosk devices query error:', devicesError.message)
    return 0
  }

  const deviceIds = (devices || []).map(d => d.id)
  if (deviceIds.length === 0) return 0

  const { data: heartbeats, error: hbError } = await supabase
    .from('device_heartbeats')
    .select('device_id')
    .in('device_id', deviceIds)
    .gte('timestamp', start.toISOString())
    .lt('timestamp', end.toISOString())

  if (hbError) {
    console.warn('Kiosk heartbeat query error:', hbError.message)
    return 0
  }

  return new Set((heartbeats || []).map((row: any) => row.device_id)).size
}

type KioskAnalyticsEvent = {
  event_type: string
  search_query: string | null
  selected_allergens?: string[] | null
  site_id?: string | null
  created_at: string
}

const getKioskEvents = async (
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  siteId: string | null,
  start: Date,
  end: Date,
  eventTypes: string[]
): Promise<KioskAnalyticsEvent[]> => {
  try {
    let query = supabase
      .from('kiosk_analytics_events')
      .select('event_type, search_query, selected_allergens, site_id, created_at')
      .eq('business_id', businessId)
      .in('event_type', eventTypes)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    const { data, error } = await query
    if (error) {
      console.warn('Kiosk analytics events query error:', error.message)
      return []
    }

    return (data || []) as KioskAnalyticsEvent[]
  } catch {
    return []
  }
}

const dayKey = (value: Date) => value.toISOString().slice(0, 10)

const buildTrends = (events: KioskAnalyticsEvent[]) => {
  const now = new Date()
  const days: Array<{ key: string; label: string }> = []
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    days.push({
      key: dayKey(date),
      label: date.toLocaleDateString('en-US', { weekday: 'short' })
    })
  }

  const buckets = new Map<string, { views: number; searches: number }>()
  for (const day of days) {
    buckets.set(day.key, { views: 0, searches: 0 })
  }

  for (const event of events) {
    const key = event.created_at.slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) continue

    if (event.event_type === 'page_view') bucket.views += 1
    if (event.event_type === 'search') bucket.searches += 1
  }

  return days.map(day => ({
    day: day.label,
    views: buckets.get(day.key)?.views || 0,
    searches: buckets.get(day.key)?.searches || 0
  }))
}

const titleCase = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const buildTopIngredients = (current: KioskAnalyticsEvent[], previous: KioskAnalyticsEvent[]) => {
  const currentCounts = new Map<string, number>()
  const previousCounts = new Map<string, number>()

  const ingest = (events: KioskAnalyticsEvent[], map: Map<string, number>) => {
    for (const event of events) {
      if (event.event_type !== 'search') continue
      const query = (event.search_query || '').trim().toLowerCase()
      if (!query) continue
      map.set(query, (map.get(query) || 0) + 1)
    }
  }

  ingest(current, currentCounts)
  ingest(previous, previousCounts)

  return Array.from(currentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([query, count]) => {
      const prev = previousCounts.get(query) || 0
      const delta = percentChange(count, prev)
      const rounded = Math.round(delta * 10) / 10
      const withSign = `${rounded >= 0 ? '+' : ''}${rounded}%`

      return {
        name: titleCase(query),
        searches: count,
        change: withSign
      }
    })
}

// Common allergens list for classification
const COMMON_ALLERGENS = [
  'peanut', 'peanuts', 'tree nut', 'tree nuts', 'milk', 'dairy', 'lactose',
  'egg', 'eggs', 'fish', 'shellfish', 'sesame', 'soy', 'soybean', 'gluten',
  'wheat', 'barley', 'rye', 'oats', 'mustard', 'celery', 'sulphite', 'sulfite'
]

const COMMON_DIETARY = [
  'vegan', 'vegetarian', 'gluten-free', 'gluten free', 'halal',
  'kosher', 'organic', 'fair trade', 'lactose-free', 'lactose free',
  'coeliac', 'celiac', 'dairy-free', 'dairy free', 'nut-free', 'nut free'
]

const classifySearch = (query: string): 'allergen' | 'dietary' | 'other' => {
  const lower = query.toLowerCase()
  if (COMMON_ALLERGENS.some(a => lower.includes(a))) return 'allergen'
  if (COMMON_DIETARY.some(d => lower.includes(d))) return 'dietary'
  return 'other'
}

const buildTopAllergens = (current: KioskAnalyticsEvent[], previous: KioskAnalyticsEvent[]) => {
  const currentCounts = new Map<string, number>()
  const previousCounts = new Map<string, number>()

  const ingest = (events: KioskAnalyticsEvent[], map: Map<string, number>) => {
    for (const event of events) {
      if (event.event_type === 'filter' && Array.isArray(event.selected_allergens)) {
        for (const allergen of event.selected_allergens) {
          const normalized = allergen.replace(/^contains_/, '').replace(/_/g, ' ').trim().toLowerCase()
          if (normalized) {
            map.set(normalized, (map.get(normalized) || 0) + 1)
          }
        }
        continue
      }

      if (event.event_type === 'search') {
        const query = (event.search_query || '').trim().toLowerCase()
        if (!query || classifySearch(query) !== 'allergen') continue
        map.set(query, (map.get(query) || 0) + 1)
      }
    }
  }

  ingest(current, currentCounts)
  ingest(previous, previousCounts)

  return Array.from(currentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([query, count]) => {
      const prev = previousCounts.get(query) || 0
      const delta = percentChange(count, prev)
      const rounded = Math.round(delta * 10) / 10
      const withSign = `${rounded >= 0 ? '+' : ''}${rounded}%`

      return {
        name: titleCase(query),
        searches: count,
        change: withSign
      }
    })
}

const buildTopDietary = (current: KioskAnalyticsEvent[], previous: KioskAnalyticsEvent[]) => {
  const currentCounts = new Map<string, number>()
  const previousCounts = new Map<string, number>()

  const ingest = (events: KioskAnalyticsEvent[], map: Map<string, number>) => {
    for (const event of events) {
      if (event.event_type === 'filter') {
        const filters = (event.search_query || '')
          .split('|')
          .map(value => value.trim())
          .filter(value => value.startsWith('dietary:'))
          .map(value => value.replace(/^dietary:/, '').trim().toLowerCase())

        for (const filter of filters) {
          if (filter) {
            map.set(filter, (map.get(filter) || 0) + 1)
          }
        }
        continue
      }

      if (event.event_type === 'search') {
        const query = (event.search_query || '').trim().toLowerCase()
        if (!query || classifySearch(query) !== 'dietary') continue
        map.set(query, (map.get(query) || 0) + 1)
      }
    }
  }

  ingest(current, currentCounts)
  ingest(previous, previousCounts)

  return Array.from(currentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([query, count]) => {
      const prev = previousCounts.get(query) || 0
      const delta = percentChange(count, prev)
      const rounded = Math.round(delta * 10) / 10
      const withSign = `${rounded >= 0 ? '+' : ''}${rounded}%`

      return {
        name: titleCase(query),
        clicks: count,
        change: withSign
      }
    })
}

const countActiveMenuItems = async (
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  siteId: string | null,
  start: Date,
  end: Date
) => {
  let query = supabase
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (siteId) {
    query = query.or(`site_id.is.null,site_id.eq.${siteId}`)
  }

  const { count, error } = await query
  if (error) {
    console.warn('Active menu items query error:', error.message)
    return 0
  }
  return count || 0
}

const countActiveMenuIngredients = async (
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  siteId: string | null,
  start: Date,
  end: Date
) => {
  if (siteId) {
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .or(`site_id.is.null,site_id.eq.${siteId}`)

    if (menuError) {
      console.warn('Site menu items ingredient query error:', menuError.message)
      return 0
    }

    const menuItemIds = (menuItems || []).map((item: any) => item.id)
    if (menuItemIds.length === 0) return 0

    const { data: links, error: linksError } = await supabase
      .from('menu_item_ingredients')
      .select('ingredient_id')
      .in('menu_item_id', menuItemIds)

    if (linksError) {
      console.warn('Menu item ingredient links query error:', linksError.message)
      return 0
    }

    return new Set((links || []).map((link: any) => link.ingredient_id).filter(Boolean)).size
  }

  let query = supabase
    .from('ingredients')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'active')

  const { count, error } = await query
  if (error) {
    console.warn('Active ingredients query error:', error.message)
    return 0
  }
  return count || 0
}

const buildSiteBreakdown = async (
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  siteId: string | null,
  events: KioskAnalyticsEvent[]
) => {
  let siteQuery = supabase
    .from('sites')
    .select('id, name')
    .eq('business_id', businessId)
    .order('name')

  if (siteId) {
    siteQuery = siteQuery.eq('id', siteId)
  }

  const { data: sites, error: sitesError } = await siteQuery
  if (sitesError) {
    console.warn('Site breakdown sites query error:', sitesError.message)
    return []
  }

  const siteIds = (sites || []).map((site: any) => site.id)
  if (siteIds.length === 0) return []

  const { data: devices, error: devicesError } = await supabase
    .from('devices')
    .select('id, site_id')
    .eq('business_id', businessId)
    .in('site_id', siteIds)

  if (devicesError) {
    console.warn('Site breakdown devices query error:', devicesError.message)
  }

  const devicesBySite = new Map<string, number>()
  for (const device of devices || []) {
    if (!device.site_id) continue
    devicesBySite.set(device.site_id, (devicesBySite.get(device.site_id) || 0) + 1)
  }

  const activityBySite = new Map<string, { views: number; searches: number }>()
  for (const event of events) {
    if (!event.site_id) continue
    const activity = activityBySite.get(event.site_id) || { views: 0, searches: 0 }
    if (event.event_type === 'page_view') activity.views += 1
    if (event.event_type === 'search') activity.searches += 1
    activityBySite.set(event.site_id, activity)
  }

  return (sites || []).map((site: any) => {
    const activity = activityBySite.get(site.id) || { views: 0, searches: 0 }
    return {
      id: site.id,
      name: site.name,
      devices: devicesBySite.get(site.id) || 0,
      views: activity.views,
      searches: activity.searches
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rangeParam = (searchParams.get('range') || 'week') as RangeKey
    const range: RangeKey = rangeParam in rangeToDays ? rangeParam : 'week'
    const siteId = searchParams.get('site_id')
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')

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

    if (siteId) {
      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('id', siteId)
        .eq('business_id', businessId)
        .single()

      if (!site) {
        return NextResponse.json({ error: 'Site not found' }, { status: 404 })
      }
    }

    let currentStart: Date
    let currentEnd: Date
    let previousStart: Date
    let previousEnd: Date

    if (startParam && endParam) {
      const parsedStart = parseDateParam(startParam)
      const parsedEnd = parseDateParam(endParam)

      if (!parsedStart || !parsedEnd) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
      }

      const start = parsedStart <= parsedEnd ? parsedStart : parsedEnd
      const end = parsedStart <= parsedEnd ? parsedEnd : parsedStart

      currentStart = start
      currentEnd = addDays(end, 1)
      const durationMs = currentEnd.getTime() - currentStart.getTime()
      previousEnd = currentStart
      previousStart = new Date(currentStart.getTime() - durationMs)
    } else {
      const resolved = resolveRange(range)
      currentStart = resolved.currentStart
      currentEnd = resolved.currentEnd
      previousStart = resolved.previousStart
      previousEnd = resolved.previousEnd
    }

    const [
      reportDownloadsCurrent,
      reportDownloadsPrevious,
      kioskInteractionsCurrent,
      kioskInteractionsPrevious,
      activeMenuItemsCurrent,
      activeMenuItemsPrevious,
      activeMenuIngredientsCurrent,
      activeMenuIngredientsPrevious,
      kioskEventsCurrent,
      kioskEventsPrevious,
      pairedDevices
    ] = await Promise.all([
      countPdfDownloads(supabase, businessId, siteId, currentStart, currentEnd),
      countPdfDownloads(supabase, businessId, siteId, previousStart, previousEnd),
      countKioskInteractions(supabase, businessId, siteId, currentStart, currentEnd),
      countKioskInteractions(supabase, businessId, siteId, previousStart, previousEnd),
      countActiveMenuItems(supabase, businessId, siteId, currentStart, currentEnd),
      countActiveMenuItems(supabase, businessId, siteId, previousStart, previousEnd),
      countActiveMenuIngredients(supabase, businessId, siteId, currentStart, currentEnd),
      countActiveMenuIngredients(supabase, businessId, siteId, previousStart, previousEnd),
      getKioskEvents(supabase, businessId, siteId, currentStart, currentEnd, ['page_view', 'search', 'filter']),
      getKioskEvents(supabase, businessId, siteId, previousStart, previousEnd, ['search', 'filter']),
      countPairedDevices(supabase, businessId, siteId),
    ])

    const trends = buildTrends(kioskEventsCurrent)
    const topIngredients = buildTopIngredients(kioskEventsCurrent, kioskEventsPrevious)
    const topAllergens = buildTopAllergens(kioskEventsCurrent, kioskEventsPrevious)
    const topDietary = buildTopDietary(kioskEventsCurrent, kioskEventsPrevious)
    const siteBreakdown = await buildSiteBreakdown(supabase, businessId, siteId, kioskEventsCurrent)

    return NextResponse.json({
      overview: {
        reportDownloads: reportDownloadsCurrent,
        kioskUsage: kioskInteractionsCurrent,
        pairedDevices,
        activeMenuIngredients: activeMenuIngredientsCurrent,
        activeMenuItems: activeMenuItemsCurrent
      },
      deltas: {
        reportDownloads: percentChange(reportDownloadsCurrent, reportDownloadsPrevious),
        kioskUsage: percentChange(kioskInteractionsCurrent, kioskInteractionsPrevious),
        pairedDevices: null,
        activeMenuIngredients: percentChange(activeMenuIngredientsCurrent, activeMenuIngredientsPrevious),
        activeMenuItems: percentChange(activeMenuItemsCurrent, activeMenuItemsPrevious)
      },
      trends,
      topIngredients,
      topAllergens,
      topDietary,
      siteBreakdown,
      topMenus: []
    })
  } catch (error: any) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load analytics' },
      { status: 500 }
    )
  }
}
