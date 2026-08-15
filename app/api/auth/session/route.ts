import { verifySessionToken } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json(
        { user: null, authenticated: false },
        { status: 200 }
      )
    }

    const payload = await verifySessionToken(authToken)

    const userId = payload.userId as string
    const email = payload.email as string

    if (!userId) {
      return NextResponse.json(
        { user: null, authenticated: false },
        { status: 200 }
      )
    }

    const supabase = createServiceClient()
    const [{ data: userBusiness }, { data: userRoleData }, { data: userData }] = await Promise.all([
      supabase
        .from('user_businesses')
        .select('business_id, role, display_name')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle(),
      supabase.auth.admin.getUserById(userId),
    ])

    const userDetails = userData?.user
    const fullName = userBusiness?.display_name || userDetails?.user_metadata?.full_name || email?.split('@')[0] || 'User'
    const twoFactorEnabled = userDetails?.user_metadata?.twoFactorEnabled || false
    const isSuperAdmin = userRoleData?.role === 'super_admin' || payload.role === 'super_admin'
    // Normal business access always comes from the live membership row. This
    // makes role changes and removals effective immediately, even if an older
    // signed session token still contains the previous role.
    const role = isSuperAdmin ? 'super_admin' : userBusiness?.role || null

    return NextResponse.json({
      user: {
        id: userId,
        email: email,
        name: fullName,
        role,
        businessId: isSuperAdmin ? (payload.businessId || null) : (userBusiness?.business_id || null),
        twoFactorEnabled,
        isImpersonating: Boolean(payload.isImpersonating),
        impersonatedByEmail: payload.impersonatedByEmail || null,
        impersonatedByUserId: payload.impersonatedByUserId || null,
      },
      authenticated: true,
    })
  } catch (error: any) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { user: null, authenticated: false },
      { status: 200 }
    )
  }
}
