import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const getUserBusinessId = async (
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
) => {
  const { data: userBusiness } = await supabase
    .from('user_businesses')
    .select('business_id')
    .eq('user_id', userId)
    .single()

  return userBusiness?.business_id || null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    const supabase = createServiceClient()
    const businessId = await getUserBusinessId(supabase, userId)

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const updates: Record<string, any> = {}

    if (typeof body.device_name === 'string') {
      updates.device_name = body.device_name
    }

    if (typeof body.device_type === 'string') {
      updates.device_type = body.device_type
    }

    if (typeof body.status === 'string') {
      updates.status = body.status
    }

    if (typeof body.last_heartbeat === 'string') {
      updates.last_heartbeat = body.last_heartbeat
    }

    if (typeof body.ip_address === 'string') {
      updates.ip_address = body.ip_address
    }

    if (typeof body.user_agent === 'string') {
      updates.user_agent = body.user_agent
    }

    const { data: device, error } = await supabase
      .from('devices')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select('*, site:sites(id, name, slug, city)')
      .single()

    if (error) {
      console.error('Error updating device:', error)
      return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
    }

    return NextResponse.json({ device })
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
      .from('devices')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId)

    if (error) {
      console.error('Error deleting device:', error)
      return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 })
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
