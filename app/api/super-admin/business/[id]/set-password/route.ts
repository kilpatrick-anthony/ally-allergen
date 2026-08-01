import { getJwtSecret, hasSuperAdminAccess } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

async function getAuthenticatedSuperAdmin() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth-token')?.value
  if (!authToken) return null
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string
    const userEmail = payload.email as string
    const userRole = payload.role as string | undefined
    const supabase = createServiceClient()

    const isSuperAdmin = await hasSuperAdminAccess({
      userEmail,
      userRole,
      userId,
      supabase,
    })

    if (!isSuperAdmin) return null
    return { userEmail }
  } catch {
    return null
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { password } = await request.json()

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Find the owner of this business
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('user_id')
      .eq('business_id', id)
      .eq('role', 'owner')
      .single()

    if (!userBusiness?.user_id) {
      return NextResponse.json({ error: 'Business owner not found' }, { status: 404 })
    }

    // Set the password directly via admin API (no email needed)
    const { data: userData, error } = await supabase.auth.admin.updateUserById(
      userBusiness.user_id,
      { password }
    )

    if (error) throw error

    return NextResponse.json({
      success: true,
      email: userData.user.email
    })
  } catch (err) {
    console.error('Set password error:', err)
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 })
  }
}
