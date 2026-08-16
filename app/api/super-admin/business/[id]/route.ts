import { getJwtSecret, hasSuperAdminAccess } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { isPlanKey } from '@/lib/plans'
import { getDealTerms } from '@/lib/deal-terms'

async function getAuthenticatedSuperAdmin() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth-token')?.value
  if (!authToken) return null

  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string
    const userEmail = payload.email as string
    const userRole = payload.role as string | undefined
    const supabase = createServiceClient()

    const isSuperAdmin = await hasSuperAdminAccess({
      userEmail,
      userRole,
      userId,
      supabase,
    })

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
      discountPercent,
      contractLengthMonths,
      discountReason,
    } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }

    if (plan && !isPlanKey(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (status && !['active', 'inactive', 'trial', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const selectedPlan = plan || 'starter'
    let dealTerms
    try {
      dealTerms = getDealTerms(selectedPlan, { discountPercent, contractLengthMonths, discountReason })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid deal terms' },
        { status: 400 }
      )
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
        plan: selectedPlan,
        status: status || 'active',
        ...dealTerms,
        billingManagement: 'manual_stripe',
        dealTermsUpdatedAt: new Date().toISOString(),
        dealTermsUpdatedBy: admin.userEmail,
      },
    }

    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        name: String(name).trim(),
        description: description || '',
        plan_type: selectedPlan,
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = createServiceClient()

    const { data: existingBusiness, error: existingError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', id)
      .single()

    if (existingError || !existingBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Remove dependent operational records first.
    const cleanupTables = [
      'kiosk_analytics_events',
      'menu_items',
      'devices',
      'sites',
      'user_businesses',
    ] as const

    for (const table of cleanupTables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('business_id', id)

      if (error) {
        console.error(`Failed deleting ${table} for business ${id}:`, error)
        return NextResponse.json({ error: `Failed to delete related ${table} records` }, { status: 500 })
      }
    }

    const { error: businessDeleteError } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id)

    if (businessDeleteError) {
      console.error('Failed deleting business record:', businessDeleteError)
      return NextResponse.json({ error: 'Failed to delete business record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedBusinessId: id,
      deletedBusinessName: existingBusiness.name,
    })
  } catch (err) {
    console.error('Super admin business delete error:', err)
    return NextResponse.json({ error: 'Failed to permanently delete business' }, { status: 500 })
  }
}
