import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  IMPERSONATOR_COOKIE_NAME,
  getSessionCookieOptions,
  hasSuperAdminAccess,
  verifySessionToken,
} from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

function clearCookie(response: NextResponse, name: string) {
  response.cookies.set(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  response.cookies.set(name, '', { path: '/', expires: new Date(0) })
}

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const backupToken = cookieStore.get(IMPERSONATOR_COOKIE_NAME)?.value
    const currentToken = cookieStore.get(AUTH_COOKIE_NAME)?.value

    if (!backupToken || !currentToken) {
      return NextResponse.json({ error: 'No active impersonation session found' }, { status: 400 })
    }

    const currentPayload = await verifySessionToken(currentToken)
    if (!currentPayload.isImpersonating) {
      return NextResponse.json({ error: 'Current session is not impersonating' }, { status: 400 })
    }

    const backupPayload = await verifySessionToken(backupToken)
    const supabase = createServiceClient()
    const isSuperAdmin = await hasSuperAdminAccess({
      userEmail: backupPayload.email,
      userRole: backupPayload.role,
      userId: backupPayload.userId,
      supabase,
    })

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Stored super admin session is no longer valid' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true, redirectTo: '/super-admin' })
    response.cookies.set(AUTH_COOKIE_NAME, backupToken, getSessionCookieOptions())
    clearCookie(response, IMPERSONATOR_COOKIE_NAME)

    return response
  } catch (error: any) {
    console.error('Stop impersonation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to stop impersonation' }, { status: 500 })
  }
}
