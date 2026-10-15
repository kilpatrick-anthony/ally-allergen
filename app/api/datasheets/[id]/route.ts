import { getJwtSecret } from '@/lib/auth'
// app/api/datasheets/[id]/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get user from auth token
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get user's business
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('business_id')
      .eq('user_id', userId)
      .single()

    if (!userBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Delete datasheet
    const { error } = await supabase
      .from('datasheets')
      .delete()
      .eq('id', id)
      .eq('business_id', userBusiness.business_id)

    if (error) {
      console.error('Error deleting datasheet:', error)
      return NextResponse.json({ error: 'Failed to delete datasheet' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/** Update document descriptions only; files, ownership and associations stay fixed. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    let userId: unknown
    try { userId = (await jwtVerify(token, getJwtSecret())).payload.userId }
    catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    if (typeof userId !== 'string' || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = createServiceClient()
    const { data: membership, error: membershipError } = await db.from('user_businesses').select('business_id, role').eq('user_id', userId).single()
    if (membershipError) return NextResponse.json({ error: 'Could not verify business access' }, { status: 403 })
    if (!membership || !['owner', 'manager', 'staff'].includes(membership.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    const limits = { supplier_name: 200, version: 100, next_review_date: 10, notes: 10000 }
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !Object.hasOwn(limits, key))) {
      return NextResponse.json({ error: 'Only document metadata can be changed' }, { status: 400 })
    }
    const values: Record<string, string | null> = {}
    for (const [key, value] of Object.entries(body)) {
      if (value !== null && (typeof value !== 'string' || value.length > limits[key as keyof typeof limits])) return NextResponse.json({ error: 'Invalid document metadata' }, { status: 400 })
      if (key === 'next_review_date' && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) {
        return NextResponse.json({ error: 'Invalid review date' }, { status: 400 })
      }
      values[key] = value || null
    }
    const { id } = await params
    const { data: datasheet, error } = await db.from('datasheets').update(values).eq('id', id).eq('business_id', membership.business_id).select().maybeSingle()
    if (error) return NextResponse.json({ error: 'Could not update document metadata' }, { status: 500 })
    if (!datasheet) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    return NextResponse.json({ datasheet })
  } catch { return NextResponse.json({ error: 'Could not update document metadata' }, { status: 500 }) }
}
