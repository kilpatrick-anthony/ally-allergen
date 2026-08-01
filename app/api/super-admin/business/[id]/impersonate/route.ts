import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  AUTH_COOKIE_NAME,
  IMPERSONATOR_COOKIE_NAME,
  getSessionCookieOptions,
  hasSuperAdminAccess,
  signSessionToken,
  verifySessionToken,
} from '@/lib/auth'

async function getAuthenticatedSuperAdmin() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!authToken) return null

  try {
    const payload = await verifySessionToken(authToken)
    const supabase = createServiceClient()
    const isSuperAdmin = await hasSuperAdminAccess({
      userEmail: payload.email,
      userRole: payload.role,
      userId: payload.userId,
      supabase,
    })

    if (!isSuperAdmin || payload.isImpersonating) {
      return null
    }

    return {
      token: authToken,
      userId: payload.userId,
      email: payload.email,
      role: payload.role || 'super_admin',
    }
  } catch {
    return null
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    if (cookieStore.get(IMPERSONATOR_COOKIE_NAME)?.value) {
      return NextResponse.json({ error: 'An impersonation session is already active' }, { status: 409 })
    }

    const { id } = await params
    const supabase = createServiceClient()

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', id)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: ownerLink, error: ownerLinkError } = await supabase
      .from('user_businesses')
      .select('user_id, role')
      .eq('business_id', id)
      .eq('role', 'owner')
      .maybeSingle()

    if (ownerLinkError || !ownerLink?.user_id) {
      return NextResponse.json({ error: 'No owner account is linked to this business yet' }, { status: 404 })
    }

    const { data: ownerUserData, error: ownerUserError } = await supabase.auth.admin.getUserById(ownerLink.user_id)
    if (ownerUserError || !ownerUserData?.user?.email) {
      return NextResponse.json({ error: 'Failed to load owner account details' }, { status: 500 })
    }

    const impersonationToken = await signSessionToken({
      userId: ownerLink.user_id,
      email: ownerUserData.user.email,
      role: ownerLink.role,
      businessId: business.id,
      isImpersonating: true,
      impersonatedByUserId: admin.userId,
      impersonatedByEmail: admin.email,
      impersonatedByRole: admin.role,
    })

    const response = NextResponse.json({
      success: true,
      redirectTo: '/admin',
      businessName: business.name,
      email: ownerUserData.user.email,
    })

    response.cookies.set(AUTH_COOKIE_NAME, impersonationToken, getSessionCookieOptions())
    response.cookies.set(IMPERSONATOR_COOKIE_NAME, admin.token, getSessionCookieOptions())

    return response
  } catch (error: any) {
    console.error('Super admin impersonation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to start impersonation' }, { status: 500 })
  }
}
