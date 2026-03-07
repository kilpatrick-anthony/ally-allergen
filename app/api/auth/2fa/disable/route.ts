// app/api/auth/2fa/disable/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify JWT token
    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
    const { payload } = await jwtVerify(authToken, secret)

    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Remove 2FA from user metadata
    const supabase = createServiceClient()

    // Get current user data
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(userId)
    if (getUserError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user metadata to disable 2FA
    const currentMetadata = userData.user.user_metadata || {}
    const updatedMetadata = {
      ...currentMetadata,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: updatedMetadata,
    })

    if (updateError) {
      return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Disable 2FA error:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}