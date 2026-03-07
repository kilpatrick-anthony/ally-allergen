// app/api/signout/route.ts
// Clears the server-side `auth-token` cookie (development + production).
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const res = NextResponse.json({ success: true })
    // Clear the auth-token cookie
    res.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    // Also send an expired cookie variant for safety
    res.cookies.set('auth-token', '', { path: '/', expires: new Date(0) })

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
