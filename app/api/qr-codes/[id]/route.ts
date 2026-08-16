import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { getJwtSecret } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

async function getContext() {
  const token = (await cookies()).get('auth-token')?.value
  if (!token) return null
  const { payload } = await jwtVerify(token, getJwtSecret())
  const userId = payload.userId as string | undefined
  if (!userId) return null
  const supabase = createServiceClient()
  const { data } = await supabase.from('user_businesses').select('business_id, role').eq('user_id', userId).single()
  return data?.business_id ? { supabase, businessId: data.business_id, role: data.role } : null
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
    if (typeof body.placement === 'string') updates.placement = body.placement.trim()
    if (body.status === 'active' || body.status === 'inactive') updates.status = body.status

    const { data, error } = await context.supabase
      .from('qr_code_deployments')
      .update(updates)
      .eq('id', id)
      .eq('business_id', context.businessId)
      .select('*, site:sites(id, name, slug), business:businesses(slug, plan_type)')
      .single()
    if (error) throw error
    return NextResponse.json({ qrCode: data })
  } catch (error: any) {
    console.error('Error updating QR code:', error)
    return NextResponse.json({ error: 'Failed to update QR code' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (context.role === 'staff') return NextResponse.json({ error: 'Staff members cannot delete QR codes' }, { status: 403 })
    const { id } = await params
    const { error } = await context.supabase
      .from('qr_code_deployments')
      .delete()
      .eq('id', id)
      .eq('business_id', context.businessId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting QR code:', error)
    return NextResponse.json({ error: 'Failed to delete QR code' }, { status: 500 })
  }
}
