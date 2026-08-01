import { getJwtSecret } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
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

    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)

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
        .select('business_id, role')
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
    const fullName = userDetails?.user_metadata?.full_name || email?.split('@')[0] || 'User'
    const twoFactorEnabled = userDetails?.user_metadata?.twoFactorEnabled || false
    const role = userRoleData?.role || userBusiness?.role || null

    return NextResponse.json({
      user: {
        id: userId,
        email: email,
        name: fullName,
        role,
        businessId: userBusiness?.business_id || null,
        twoFactorEnabled,
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
