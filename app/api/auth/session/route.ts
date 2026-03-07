// app/api/auth/session/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Session check requested')
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    console.log('🍪 Auth token from cookie:', authToken ? 'EXISTS' : 'NOT FOUND')

    if (!authToken) {
      console.log('❌ No auth token, returning unauthenticated')
      return NextResponse.json(
        { user: null, authenticated: false },
        { status: 200 }
      )
    }

    // Verify JWT token
    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
    const { payload } = await jwtVerify(authToken, secret)

    const userId = payload.userId as string
    const email = payload.email as string

    console.log('✅ Token verified for user:', userId)

    if (!userId) {
      console.log('❌ No userId in token')
      return NextResponse.json(
        { user: null, authenticated: false },
        { status: 200 }
      )
    }

    // Get user's business association
    const supabase = createServiceClient()
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('business_id, role')
      .eq('user_id', userId)
      .single()

    // Get user details including metadata
    const { data: { user: userDetails }, error: userDetailsError } = await supabase.auth.admin.getUserById(userId)
    
    console.log('👤 User details:', userDetails?.user_metadata)
    console.log('👤 User details error:', userDetailsError)
    
    const fullName = userDetails?.user_metadata?.full_name || email?.split('@')[0] || 'User'
    const twoFactorEnabled = userDetails?.user_metadata?.twoFactorEnabled || false

    console.log('✅ User full name:', fullName)
    console.log('🔐 2FA enabled:', twoFactorEnabled)

    return NextResponse.json({
      user: {
        id: userId,
        email: email,
        name: fullName,
        role: userBusiness?.role || null,
        businessId: userBusiness?.business_id || null,
        twoFactorEnabled: twoFactorEnabled,
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
