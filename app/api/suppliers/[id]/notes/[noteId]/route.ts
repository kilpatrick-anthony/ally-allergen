import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const getUserBusinessId = async (supabase: ReturnType<typeof createServiceClient>, userId: string) => {
  const { data: userBusiness } = await supabase
    .from('user_businesses')
    .select('business_id')
    .eq('user_id', userId)
    .single()

  return userBusiness?.business_id || null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params

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

    const body = await request.json()
    const noteText = typeof body.note === 'string' ? body.note.trim() : ''

    if (!noteText) {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const businessId = await getUserBusinessId(supabase, userId)

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: note, error } = await supabase
      .from('supplier_notes')
      .update({
        note: noteText,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('supplier_id', id)
      .eq('business_id', businessId)
      .select()
      .single()

    if (error) {
      console.error('Error updating supplier note:', error)
      return NextResponse.json({ error: 'Failed to update supplier note' }, { status: 500 })
    }

    return NextResponse.json({ note })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params

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

    const { error } = await supabase
      .from('supplier_notes')
      .delete()
      .eq('id', noteId)
      .eq('supplier_id', id)
      .eq('business_id', businessId)

    if (error) {
      console.error('Error deleting supplier note:', error)
      return NextResponse.json({ error: 'Failed to delete supplier note' }, { status: 500 })
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
