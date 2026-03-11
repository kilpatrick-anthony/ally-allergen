// app/api/signin/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, rememberMe } = body

    console.log('🔐 Server-side sign-in started for:', email)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Verify credentials using service client
    const supabase = createServiceClient()
    
    // List users and find matching email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ List users error:', listError)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }
    
    const user = users?.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password by attempting sign-in with timeout
    try {
      const { error: signInError } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ])
      
      if (signInError) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
    } catch (err: any) {
      // If timeout, password verification failed
      if (err.message === 'timeout') {
        console.log('⚠️ Password check timed out, assuming invalid')
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      throw err
    }

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
