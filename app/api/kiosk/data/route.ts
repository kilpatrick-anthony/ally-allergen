import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const target = (searchParams.get('target') || '').trim()
    const siteId = (searchParams.get('site_id') || '').trim()

    if (!target) {
      return NextResponse.json({ error: 'target is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const isBusinessId = UUID_PATTERN.test(target)

    const businessQuery = supabase
      .from('businesses')
      .select('id, name, slug, logo_url, primary_color, secondary_color, kiosk_display_name, address, phone, website')

    const { data: business, error: businessError } = isBusinessId
      ? await businessQuery.eq('id', target).single()
      : await businessQuery.eq('slug', target).single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Kiosk business not found' }, { status: 404 })
    }

    let menuQuery = supabase
      .from('menu_items')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('display_order')

    if (siteId) {
      menuQuery = menuQuery.or(`site_id.is.null,site_id.eq.${siteId}`)
    }

    const { data: menuItems, error: menuError } = await menuQuery

    if (menuError) {
      console.error('Error fetching kiosk menu data:', menuError)
      return NextResponse.json({ error: 'Failed to load menu data' }, { status: 500 })
    }

    return NextResponse.json({
      business,
      menuItems: menuItems || [],
    })
  } catch (error: any) {
    console.error('Unexpected kiosk data error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
