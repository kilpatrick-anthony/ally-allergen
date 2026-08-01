import { getJwtSecret } from '@/lib/auth'
// app/api/auth/2fa/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { TOTP, generateSecret } from 'otplib'
import * as crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, secret } = body

    if (!code || !secret) {
      return NextResponse.json({ error: 'Code and secret required' }, { status: 400 })
    }

    // Get auth token from cookies
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify JWT token
    const jwtSecret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, jwtSecret)

    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verify the TOTP code
    const totp = new TOTP()
    const isValid = totp.verify(code, secret)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Generate backup codes
    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
    }

    // Store 2FA secret and backup codes in user metadata
    const supabase = createServiceClient()

    // Get current user data
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(userId)
    if (getUserError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user metadata with 2FA info
    const currentMetadata = userData.user.user_metadata || {}
    const updatedMetadata = {
      ...currentMetadata,
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      backupCodes: backupCodes,
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: updatedMetadata,
    })

    if (updateError) {
      return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      backupCodes,
    })
  } catch (err: any) {
    console.error('Verify 2FA error:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}