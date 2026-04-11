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
  
  return count || 0
}

const countKioskInteractions = async (
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  siteId: string | null,
  start: Date,
  end: Date
) => {
  // Count active kiosk devices
  let query = supabase
    .from('kiosk_devices')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)

  if (siteId) {
    query = query.eq('site_id', siteId)
  }

  const { count, error } = await query

  if (error) {
    console.warn('Kiosk devices query error:', error.message)
    return 0
  }

  return count || 0
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
    query = query.eq('site_id', siteId)
  }

  const { count } = await query
  return count || 0
}

const countActiveMenuIngredients = async (
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  siteId: string | null,
  start: Date,
  end: Date
) => {
  let query = supabase
    .from('ingredients')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'active')

  if (siteId) {
    query = query.eq('site_id', siteId)
  }

  const { count } = await query
  return count || 0
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
      activeMenuIngredientsPrevious
    ] = await Promise.all([
      countPdfDownloads(supabase, businessId, siteId, currentStart, currentEnd),
      countPdfDownloads(supabase, businessId, siteId, previousStart, previousEnd),
      countKioskInteractions(supabase, businessId, siteId, currentStart, currentEnd),
      countKioskInteractions(supabase, businessId, siteId, previousStart, previousEnd),
      countActiveMenuItems(supabase, businessId, siteId, currentStart, currentEnd),
      countActiveMenuItems(supabase, businessId, siteId, previousStart, previousEnd),
      countActiveMenuIngredients(supabase, businessId, siteId, currentStart, currentEnd),
      countActiveMenuIngredients(supabase, businessId, siteId, previousStart, previousEnd)
    ])

    return NextResponse.json({
      overview: {
        reportDownloads: reportDownloadsCurrent,
        kioskUsage: kioskInteractionsCurrent,
        activeMenuIngredients: activeMenuIngredientsCurrent,
        activeMenuItems: activeMenuItemsCurrent
      },
      deltas: {
        reportDownloads: percentChange(reportDownloadsCurrent, reportDownloadsPrevious),
        kioskUsage: percentChange(kioskInteractionsCurrent, kioskInteractionsPrevious),
        activeMenuIngredients: percentChange(activeMenuIngredientsCurrent, activeMenuIngredientsPrevious),
        activeMenuItems: percentChange(activeMenuItemsCurrent, activeMenuItemsPrevious)
      },
      trends: [],
      topIngredients: [],
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
