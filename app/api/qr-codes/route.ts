import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { getJwtSecret } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

async function getRequestContext() {
  const token = (await cookies()).get('auth-token')?.value
  if (!token) return null
  const { payload } = await jwtVerify(token, getJwtSecret())
  const userId = payload.userId as string | undefined
  if (!userId) return null

  const supabase = createServiceClient()
  const { data: membership } = await supabase
    .from('user_businesses')
    .select('business_id')
    .eq('user_id', userId)
    .single()
  if (!membership?.business_id) return null

  return { supabase, userId, businessId: membership.business_id }
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const siteId = request.nextUrl.searchParams.get('siteId')
    const { data: business } = await context.supabase
      .from('businesses')
      .select('slug, plan_type')
      .eq('id', context.businessId)
      .single()
    let query = context.supabase
      .from('qr_code_deployments')
      .select('*, site:sites(id, name, slug), business:businesses(slug, plan_type)')
      .eq('business_id', context.businessId)
      .order('created_at', { ascending: false })
    if (siteId) query = query.eq('site_id', siteId)

    const { data: deployments, error } = await query
    if (error) throw error

    return NextResponse.json({
      businessSlug: business?.slug || context.businessId,
      planType: business?.plan_type || 'starter',
      qrCodes: deployments || [],
    })
  } catch (error: any) {
    console.error('Error fetching QR codes:', error)
    return NextResponse.json({ error: 'Failed to fetch QR codes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const siteId = typeof body.site_id === 'string' ? body.site_id : ''
    if (!name || !siteId) {
      return NextResponse.json({ error: 'Site and QR code name are required' }, { status: 400 })
    }

    const { data: site } = await context.supabase
      .from('sites')
      .select('id')
      .eq('id', siteId)
      .eq('business_id', context.businessId)
      .single()
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    const { data, error } = await context.supabase
      .from('qr_code_deployments')
      .insert({
        business_id: context.businessId,
        site_id: siteId,
        name,
        placement: typeof body.placement === 'string' ? body.placement.trim() : '',
        status: 'active',
        created_by: context.userId,
      })
      .select('*, site:sites(id, name, slug), business:businesses(slug, plan_type)')
      .single()
    if (error) throw error

    return NextResponse.json({ qrCode: { ...data, scan_count: 0, last_scanned_at: null } })
  } catch (error: any) {
    console.error('Error creating QR code:', error)
    return NextResponse.json({ error: 'Failed to create QR code' }, { status: 500 })
  }
}
