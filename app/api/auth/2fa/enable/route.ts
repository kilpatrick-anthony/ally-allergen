import { getJwtSecret } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { generateSecret } from 'otplib'

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify JWT token
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)

    const userId = payload.userId as string
    const email = payload.email as string

    if (!userId || !email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Generate TOTP secret
    const totpSecret = generateSecret()

    // Create TOTP URI for QR code
    const issuer = 'AllyJen'
    const accountName = email
    const totpUri = `otpauth://totp/${issuer}:${accountName}?secret=${totpSecret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`

    // Store the secret temporarily (you might want to store this in a database or cache)
    // For now, we'll return it and expect the client to send it back for verification

    return NextResponse.json({
      secret: totpSecret,
      qrCodeUrl: totpUri,
      success: true
    })
  } catch (err: any) {
    console.error('Enable 2FA error:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}