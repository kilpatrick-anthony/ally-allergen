import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const EVENT_TYPES = new Set([
  'page_view',
  'search',
  'filter',
  'time_on_page',
  'download',
  'qr_scan'
])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    const slug = String(body?.slug || '').trim()
    const eventType = String(body?.eventType || '').trim()
    const siteId = String(body?.siteId || '').trim() || null
    const searchQuery = String(body?.searchQuery || '').trim() || null
    const downloadType = String(body?.downloadType || '').trim() || null
    const scanSource = String(body?.scanSource || '').trim() || null
    const timeOnPage = Number.isFinite(body?.timeOnPage)
      ? Math.max(0, Math.floor(Number(body.timeOnPage)))
      : null
    const selectedAllergens = Array.isArray(body?.selectedAllergens)
      ? body.selectedAllergens.map((value: unknown) => String(value)).filter(Boolean)
      : []

    if (!slug || !eventType || !EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    if (siteId && !UUID_PATTERN.test(siteId)) {
      return NextResponse.json({ error: 'Invalid site id' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const isBusinessId = UUID_PATTERN.test(slug)
    const businessQuery = supabase.from('businesses').select('id, slug')

    const { data: business, error: businessError } = isBusinessId
      ? await businessQuery.eq('id', slug).single()
      : await businessQuery.eq('slug', slug).single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const insertPayload = {
      business_id: business.id,
      site_id: siteId,
      slug: business.slug || slug,
      event_type: eventType,
      search_query: searchQuery,
      selected_allergens: selectedAllergens,
      download_type: downloadType,
      scan_source: scanSource,
      time_on_page: timeOnPage,
    }

    const { error: insertError } = await supabase
      .from('kiosk_analytics_events')
      .insert(insertPayload)

    if (insertError) {
      console.error('Failed to insert kiosk analytics event:', insertError)
      return NextResponse.json({ error: 'Failed to store event' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Unexpected kiosk event error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
