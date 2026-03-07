// app/api/pdf/track-download/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json().catch(() => ({}))
    const downloadType = typeof body?.downloadType === 'string' ? body.downloadType : null
    const requestedSiteId = typeof body?.siteId === 'string' ? body.siteId : null
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's business
    const { data: userBusiness, error: ubError } = await supabase
      .from('user_businesses')
      .select('business_id')
      .eq('user_id', user.id)
      .single()

    if (ubError || !userBusiness) {
      return NextResponse.json(
        { error: 'No business found' },
        { status: 404 }
      )
    }

    // Get business info (no longer checking trial limits)
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', userBusiness.business_id)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // PDF downloads are now always allowed - no trial restrictions

    let siteId: string | null = null
    if (requestedSiteId) {
      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('id', requestedSiteId)
        .eq('business_id', userBusiness.business_id)
        .single()
      siteId = site?.id || null
    }

    // Log the download event (optional - for analytics)
    const { error: eventError } = await supabase
      .from('pdf_download_events')
      .insert({
        business_id: business.id,
        site_id: siteId,
        user_id: user.id,
        download_type: downloadType
      })

    if (eventError) {
      console.error('Failed to log PDF download event:', eventError)
    }

    return NextResponse.json({
      allowed: true
    })
  } catch (err) {
    console.error('PDF download tracking error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
