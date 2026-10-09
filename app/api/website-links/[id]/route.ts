import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getJwtSecret } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

async function getContext() {
  const token = (await cookies()).get('auth-token')?.value
  if (!token) return null
  const { payload } = await jwtVerify(token, getJwtSecret()).catch(() => ({ payload: {} as Record<string, unknown> }))
  const userId = payload.userId as string | undefined
  if (!userId) return null
  const supabase = createServiceClient()
  const { data } = await supabase.from('user_businesses').select('business_id, role').eq('user_id', userId).single()
  return data?.business_id ? { supabase, businessId: data.business_id, role: data.role } : null
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (context.role === 'staff') return NextResponse.json({ error: 'Staff members cannot delete website links' }, { status: 403 })
    const { id } = await params
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid link ID' }, { status: 400 })
    const { data, error } = await context.supabase
      .from('website_links')
      .delete()
      .eq('id', id)
      .eq('business_id', context.businessId)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Website link not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting website link:', error)
    return NextResponse.json({ error: 'Failed to delete website link' }, { status: 500 })
  }
}
