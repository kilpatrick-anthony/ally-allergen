import { signSessionToken, getSessionCookieOptions, AUTH_COOKIE_NAME } from '@/lib/auth'
// app/api/signin/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, rememberMe } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Use anon key client for signInWithPassword — service role key doesn't work for this
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: authData, error: signInError } = await anonClient.auth.signInWithPassword({ email, password })

    if (signInError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const user = authData.user

    const supabase = createServiceClient()
    const [{ data: userRoleData }, { data: userBusiness }] = await Promise.all([
      supabase.from('users').select('role').eq('id', user.id).maybeSingle(),
      supabase.from('user_businesses').select('business_id, role').eq('user_id', user.id).maybeSingle(),
    ])

    const token = await signSessionToken({
      userId: user.id,
      email: user.email || email,
      role: userRoleData?.role || userBusiness?.role || null,
      businessId: userBusiness?.business_id || null,
    })

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
    })

    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions(rememberMe ? 60 * 60 * 24 * 30 : undefined))

    return response

  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
