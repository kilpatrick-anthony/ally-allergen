// Development-only debug endpoint: /api/debug/cookies
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  // Only enable in development to avoid exposing tokens in production
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value || null

    const result: any = { authTokenExists: !!authToken }

    if (authToken) {
      try {
        const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
        const { payload } = await jwtVerify(authToken, secret)
        result.payload = payload
      } catch (err: any) {
        result.payloadError = String(err.message || err)
      }
    }

    console.log('DEBUG /api/debug/cookies ->', result)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('DEBUG /api/debug/cookies error:', err)
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}
