import { getJwtSecret } from '@/lib/auth'
// app/api/auth/2fa/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { verify as verifyOtp } from 'otplib'
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
    const verification = await verifyOtp({
      secret,
      token: String(code).replace(/\s/g, ''),
      epochTolerance: 30,
    })
    const isValid = verification.valid

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Generate backup codes
    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
    }

    // Store authorization data in server-controlled app_metadata. user_metadata
    // can be edited by the account holder and must not be trusted for access.
    const supabase = createServiceClient()

    // Get current user data
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(userId)
    if (getUserError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user metadata with 2FA info
    const currentAppMetadata = userData.user.app_metadata || {}
    const currentUserMetadata = userData.user.user_metadata || {}
    const updatedAppMetadata = {
      ...currentAppMetadata,
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      backupCodeHashes: backupCodes.map((backupCode) =>
        crypto.createHash('sha256').update(backupCode).digest('hex')
      ),
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: updatedAppMetadata,
      user_metadata: {
        ...currentUserMetadata,
        twoFactorEnabled: true,
        twoFactorSecret: null,
        backupCodes: null,
      },
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
