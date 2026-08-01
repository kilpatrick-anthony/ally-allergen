// app/api/signout/route.ts
// Clears the server-side `auth-token` cookie (development + production).
import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, IMPERSONATOR_COOKIE_NAME } from '@/lib/auth'

function clearCookie(res: NextResponse, name: string) {
  res.cookies.set(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  res.cookies.set(name, '', { path: '/', expires: new Date(0) })
}

export async function POST(request: NextRequest) {
  try {
    const res = NextResponse.json({ success: true })
    clearCookie(res, AUTH_COOKIE_NAME)
    clearCookie(res, IMPERSONATOR_COOKIE_NAME)

    return res
  } catch (err: any) {
    console.error('Signout error:', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Allow GET for easy manual testing in browser
  return POST(request)
}
