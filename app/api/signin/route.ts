// app/api/signin/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

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
    console.log('✅ Credentials verified for:', user.id)

    // Create a simple JWT session token
    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret)

    console.log('🍪 Setting auth-token cookie for user:', user.id)

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // rememberMe: 30-day persistent cookie; otherwise session cookie (expires on browser close)
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
      path: '/'
    })

    console.log('✅ Sign-in complete, cookie set')

    return response

  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
