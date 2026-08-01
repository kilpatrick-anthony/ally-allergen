import { getJwtSecret } from '@/lib/auth'
// app/api/auth/change-password/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { currentPassword, newPassword } = body
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password required' }, { status: 400 })
    }

    // Get auth token from cookies (similar to session route)
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

    // Use service client for operations
    const supabase = createServiceClient()

    // Get user details from Supabase
    const { data: userDetails, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !userDetails) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Try to update password directly first (for recently authenticated users)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (!updateError) {
      return NextResponse.json({ success: true })
    }

    // If direct update fails, re-authenticate and try again
    // Sign out current session first
    await supabase.auth.signOut()

    // Re-authenticate user with current password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userDetails.user.email || email,
      password: currentPassword
    })
    if (signInError || !signInData.user) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Update password after re-authentication
    const { error: updateError2 } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError2) {
      return NextResponse.json({ error: updateError2.message || 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Change password error:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}
