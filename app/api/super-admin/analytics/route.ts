// app/api/super-admin/analytics/route.ts - Platform-wide analytics for FSAI, HSE reporting
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

type RangeKey = 'week' | 'month' | 'quarter' | 'year'

const rangeToDays: Record<RangeKey, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365
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

const isSuperAdmin = async (userId: string, supabase: ReturnType<typeof createServiceClient>) => {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  
  return data?.role === 'super_admin'
}

const titleCase = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

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

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')
    const verified = await jwtVerify(token, secret).catch(() => null)

    if (!verified?.payload?.sub) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = verified.payload.sub as string
    const authorized = await isSuperAdmin(userId, supabase)

    if (!authorized) {
      return NextResponse.json(
        { error: 'Forbidden - Super admin access required' },
        { status: 403 }
      )
    }

    // Parse date parameters
    const searchParams = req.nextUrl.searchParams
    const rangeParam = (searchParams.get('range') as RangeKey) || 'month'
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')

    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date

    if (startParam && endParam) {
      const start = new Date(startParam)
      const end = new Date(endParam)
      currentStart = start
      currentEnd = end
      currentEnd = new Date(currentEnd.getTime() + 24 * 60 * 60 * 1000)
      const durationMs = currentEnd.getTime() - currentStart.getTime()
      previousEnd = currentStart
      previousStart = new Date(currentStart.getTime() - durationMs)
    } else {
      const resolved = resolveRange(rangeParam)
      currentStart = resolved.currentStart
      currentEnd = resolved.currentEnd
      previousStart = resolved.previousStart
      previousEnd = resolved.previousEnd
    }

    // Get all business IDs
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')

    if (businessError || !businesses) {
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      )
    }

    const businessIds = businesses.map(b => b.id)

    // Count total kiosk devices
    const { count: totalKiosks } = await supabase
      .from('kiosk_devices')
      .select('id', { count: 'exact', head: true })

    // Get all kiosk analytics events for current period
    const { data: kioskEventsCurrent } = await supabase
      .from('kiosk_analytics_events')
      .select('event_type, search_query, business_id')
      .gte('created_at', currentStart.toISOString())
      .lt('created_at', currentEnd.toISOString())

    // Get all kiosk analytics events for previous period
    const { data: kioskEventsPrevious } = await supabase
      .from('kiosk_analytics_events')
      .select('event_type, search_query, business_id')
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', previousEnd.toISOString())

    // Count PDF downloads network-wide
    const { count: downloadsCurrent } = await supabase
      .from('pdf_download_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', currentStart.toISOString())
      .lt('created_at', currentEnd.toISOString())

    const { count: downloadsPrevious } = await supabase
      .from('pdf_download_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', previousEnd.toISOString())

    // Build analytics
    const totalSearches = (kioskEventsCurrent || []).filter(e => e.event_type === 'search').length
    const totalSearchesPrevious = (kioskEventsPrevious || []).filter(e => e.event_type === 'search').length

    // Calculate top allergens
    const allergenMap = new Map<string, number>()
    const allergenMapPrev = new Map<string, number>()

    ;(kioskEventsCurrent || []).forEach(event => {
      if (event.event_type === 'search' && event.search_query) {
        const query = event.search_query.toLowerCase()
        if (classifySearch(query) === 'allergen') {
          allergenMap.set(query, (allergenMap.get(query) || 0) + 1)
        }
      }
    })

    ;(kioskEventsPrevious || []).forEach(event => {
      if (event.event_type === 'search' && event.search_query) {
        const query = event.search_query.toLowerCase()
        if (classifySearch(query) === 'allergen') {
          allergenMapPrev.set(query, (allergenMapPrev.get(query) || 0) + 1)
        }
      }
    })

    const topAllergens = Array.from(allergenMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([query, count]) => {
        const prev = allergenMapPrev.get(query) || 0
        const delta = percentChange(count, prev)
        const rounded = Math.round(delta * 10) / 10
        const withSign = `${rounded >= 0 ? '+' : ''}${rounded}%`
        return {
          name: titleCase(query),
          searches: count,
          change: withSign
        }
      })

    // Calculate top dietary
    const dietaryMap = new Map<string, number>()
    const dietaryMapPrev = new Map<string, number>()

    ;(kioskEventsCurrent || []).forEach(event => {
      if (event.event_type === 'search' && event.search_query) {
        const query = event.search_query.toLowerCase()
        if (classifySearch(query) === 'dietary') {
          dietaryMap.set(query, (dietaryMap.get(query) || 0) + 1)
        }
      }
    })

    ;(kioskEventsPrevious || []).forEach(event => {
      if (event.event_type === 'search' && event.search_query) {
        const query = event.search_query.toLowerCase()
        if (classifySearch(query) === 'dietary') {
          dietaryMapPrev.set(query, (dietaryMapPrev.get(query) || 0) + 1)
        }
      }
    })

    const topDietary = Array.from(dietaryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([query, count]) => {
        const prev = dietaryMapPrev.get(query) || 0
        const delta = percentChange(count, prev)
        const rounded = Math.round(delta * 10) / 10
        const withSign = `${rounded >= 0 ? '+' : ''}${rounded}%`
        return {
          name: titleCase(query),
          clicks: count,
          change: withSign
        }
      })

    // Calculate top businesses by engagement
    const businessEngagement = new Map<string, { name: string; searches: number; kiosks: number }>()

    businesses.forEach(biz => {
      businessEngagement.set(biz.id, { name: biz.name, searches: 0, kiosks: 0 })
    })

    ;(kioskEventsCurrent || []).forEach(event => {
      if (event.event_type === 'search' && event.business_id) {
        const entry = businessEngagement.get(event.business_id)
        if (entry) {
          entry.searches += 1
        }
      }
    })

    // Add kiosk counts to businesses
    const { data: devicesByBusiness } = await supabase
      .from('kiosk_devices')
      .select('business_id')

    ;(devicesByBusiness || []).forEach(device => {
      const entry = businessEngagement.get(device.business_id)
      if (entry) {
        entry.kiosks += 1
      }
    })

    const topBusinesses = Array.from(businessEngagement.values())
      .filter(b => b.searches > 0 || b.kiosks > 0)
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 10)

    return NextResponse.json({
      overview: {
        totalBusinesses: businesses.length,
        activeKiosks: totalKiosks || 0,
        totalSearches,
        totalDownloads: downloadsCurrent || 0,
        averageSearchPerBusiness: businesses.length > 0 ? totalSearches / businesses.length : 0,
        averageKiosksPerBusiness: businesses.length > 0 ? (totalKiosks || 0) / businesses.length : 0
      },
      deltas: {
        businesses: 0, // Could track business growth over time
        searches: percentChange(totalSearches, totalSearchesPrevious),
        downloads: percentChange(downloadsCurrent || 0, downloadsPrevious || 0)
      },
      trends: [], // Could build daily trends if needed
      topAllergens,
      topDietary,
      topBusinesses
    })
  } catch (error: any) {
    console.error('Super Admin Analytics API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load analytics' },
      { status: 500 }
    )
  }
}
