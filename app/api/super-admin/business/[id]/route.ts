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
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL
    const isSuperAdmin = userEmail === superAdminEmail || payload.role === 'super_admin'

    if (!isSuperAdmin) return null
    return { userEmail }
  } catch {
    return null
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      plan,
      status,
      ownerName,
      phone,
      address,
      city,
      postalCode,
      country,
    } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }

    if (plan && !['starter', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (status && !['active', 'inactive', 'trial', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: existingBusiness, error: existingError } = await supabase
      .from('businesses')
      .select('id, settings')
      .eq('id', id)
      .single()

    if (existingError || !existingBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const nextSettings = {
      ...(existingBusiness.settings || {}),
      address: {
        ...((existingBusiness.settings || {}).address || {}),
        street: address ?? ((existingBusiness.settings || {}).address || {}).street ?? '',
        city: city ?? ((existingBusiness.settings || {}).address || {}).city ?? '',
        postalCode: postalCode ?? ((existingBusiness.settings || {}).address || {}).postalCode ?? '',
        country: country ?? ((existingBusiness.settings || {}).address || {}).country ?? '',
        phone: phone ?? ((existingBusiness.settings || {}).address || {}).phone ?? '',
      },
      subscription: {
        ...((existingBusiness.settings || {}).subscription || {}),
        plan: plan || 'starter',
        status: status || 'active',
      },
    }

    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        name: String(name).trim(),
        description: description || '',
        plan_type: plan || 'starter',
        status: status || 'active',
        settings: nextSettings,
      })
      .eq('id', id)

    if (updateError) throw updateError

    if (ownerName) {
      const { data: ownerLink } = await supabase
        .from('user_businesses')
        .select('user_id')
        .eq('business_id', id)
        .eq('role', 'owner')
        .single()

      if (ownerLink?.user_id) {
        const { error: ownerUpdateError } = await supabase.auth.admin.updateUserById(ownerLink.user_id, {
          user_metadata: {
            full_name: ownerName,
            business_name: String(name).trim(),
          },
        })

        if (ownerUpdateError) {
          console.warn('Failed to update owner metadata:', ownerUpdateError.message)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Super admin business update error:', err)
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 })
  }
}
