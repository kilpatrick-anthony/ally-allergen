import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getJwtSecret } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

async function getRequestContext() {
  const token = (await cookies()).get('auth-token')?.value
  if (!token) return null
  const { payload } = await jwtVerify(token, getJwtSecret()).catch(() => ({ payload: {} as Record<string, unknown> }))
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

const linkInput = z.object({
  name: z.string().trim().min(1).max(100),
  site_id: z.string().uuid(),
  placement: z.string().trim().max(200).optional().default(''),
})

export async function GET() {
  try {
    const context = await getRequestContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data, error } = await context.supabase
      .from('website_links')
      .select('id, business_id, site_id, name, placement, created_at, site:sites(id, name)')
      .eq('business_id', context.businessId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ links: data || [] })
  } catch (error) {
    console.error('Error fetching website links:', error)
    return NextResponse.json({ error: 'Unable to load website links' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const input = linkInput.safeParse(await request.json().catch(() => null))
    if (!input.success) return NextResponse.json({ error: 'A name (up to 100 characters), valid location and placement (up to 200 characters) are required' }, { status: 400 })

    const { data: site, error: siteError } = await context.supabase
      .from('sites').select('id').eq('id', input.data.site_id).eq('business_id', context.businessId).maybeSingle()
    if (siteError) throw siteError
    if (!site) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const { data, error } = await context.supabase
      .from('website_links')
      .insert({ ...input.data, business_id: context.businessId })
      .select('id, business_id, site_id, name, placement, created_at, site:sites(id, name)')
      .single()
    if (error) throw error
    return NextResponse.json({ link: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating website link:', error)
    return NextResponse.json({ error: 'Unable to create website link' }, { status: 500 })
  }
}
