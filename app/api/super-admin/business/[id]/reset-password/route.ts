// app/api/super-admin/business/[id]/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

async function getAuthenticatedSuperAdmin() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth-token')?.value
  if (!authToken) return null
  try {
    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
    const { payload } = await jwtVerify(authToken, secret)
    const userEmail = payload.email as string
    if (userEmail !== 'admin@allyjen.com' && userEmail !== 'admin@allyjen.ie') return null
    return { userEmail }
  } catch {
    return null
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = createServiceClient()

    // Find the owner of this business
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('user_id')
      .eq('business_id', id)
      .eq('role', 'owner')
      .single()

    if (!userBusiness?.user_id) {
      return NextResponse.json({ error: 'Business owner not found' }, { status: 404 })
    }

    const { data: userData } = await supabase.auth.admin.getUserById(userBusiness.user_id)
    const ownerEmail = userData?.user?.email
    if (!ownerEmail) {
      return NextResponse.json({ error: 'Owner email not found' }, { status: 404 })
    }

    const { error } = await supabase.auth.resetPasswordForEmail(ownerEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://allyjen.ie'}/auth/update-password`
    })

    if (error) throw error

    return NextResponse.json({ success: true, email: ownerEmail })
  } catch (err) {
    console.error('Password reset error:', err)
    return NextResponse.json({ error: 'Failed to send password reset email' }, { status: 500 })
  }
}
