import { signSessionToken, getSessionCookieOptions, AUTH_COOKIE_NAME } from '@/lib/auth'
// app/api/signin/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verify as verifyOtp } from 'otplib'
import { createHash, timingSafeEqual } from 'crypto'

function backupCodeHash(code: string) {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, rememberMe, twoFactorCode } = body

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
    const { data: adminUser } = await supabase.auth.admin.getUserById(user.id)
    const appMetadata = adminUser?.user?.app_metadata || {}
    const legacyMetadata = adminUser?.user?.user_metadata || {}
    const twoFactorEnabled = Boolean(appMetadata.twoFactorEnabled || legacyMetadata.twoFactorEnabled)
    let mfaVerified = false

    if (twoFactorEnabled) {
      if (!twoFactorCode) {
        return NextResponse.json({ requiresTwoFactor: true }, { status: 202 })
      }
      const secret = appMetadata.twoFactorSecret || legacyMetadata.twoFactorSecret
      const token = String(twoFactorCode).replace(/\s/g, '')
      const totpResult = secret
        ? await verifyOtp({ secret, token, epochTolerance: 30 })
        : { valid: false }
      const totpValid = totpResult.valid
      const submittedHash = backupCodeHash(String(twoFactorCode))
      const storedHashes: string[] = Array.isArray(appMetadata.backupCodeHashes)
        ? appMetadata.backupCodeHashes
        : Array.isArray(legacyMetadata.backupCodes)
          ? legacyMetadata.backupCodes.map((code: string) => backupCodeHash(code))
          : []
      const matchedIndex = storedHashes.findIndex((hash) => {
        const left = Buffer.from(hash)
        const right = Buffer.from(submittedHash)
        return left.length === right.length && timingSafeEqual(left, right)
      })

      if (!totpValid && matchedIndex < 0) {
        return NextResponse.json({ error: 'Invalid authenticator or backup code' }, { status: 401 })
      }
      if (matchedIndex >= 0) {
        await supabase.auth.admin.updateUserById(user.id, {
          app_metadata: { ...appMetadata, backupCodeHashes: storedHashes.filter((_, index) => index !== matchedIndex) },
        })
      }
      mfaVerified = true
    }

    const [{ data: userRoleData }, { data: userBusiness }] = await Promise.all([
      supabase.from('users').select('role').eq('id', user.id).maybeSingle(),
      supabase.from('user_businesses').select('business_id, role').eq('user_id', user.id).maybeSingle(),
    ])

    const token = await signSessionToken({
      userId: user.id,
      email: user.email || email,
      role: userRoleData?.role || userBusiness?.role || null,
      businessId: userBusiness?.business_id || null,
      mfaVerified,
      mfaVerifiedAt: mfaVerified ? Date.now() : undefined,
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
