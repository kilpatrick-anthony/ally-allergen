import { getJwtSecret, hasSuperAdminAccess } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { getMonthlyRevenueForPlan, isPlanKey } from '@/lib/plans'

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
    return { userId, userEmail }
  } catch {
    return null
  }
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export async function GET() {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient()

    const { data: businesses, error } = await supabase
      .from('businesses')
      .select(`
        id, name, slug, status, plan_type, created_at, trial_ends_at,
        settings,
        user_businesses (
          role,
          user_id
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    const businessIds = (businesses || []).map((b: any) => b.id)

    let siteCountsByBusiness: Record<string, number> = {}
    let deviceCountsByBusiness: Record<string, number> = {}
    let onlineDeviceCountsByBusiness: Record<string, number> = {}
    let offlineDeviceCountsByBusiness: Record<string, number> = {}
    let menuItemCountsByBusiness: Record<string, number> = {}
    let lastActivityByBusiness: Record<string, string> = {}

    if (businessIds.length > 0) {
      const [sitesResult, devicesResult, menuItemsResult, activityResult] = await Promise.all([
        supabase
          .from('sites')
          .select('business_id')
          .in('business_id', businessIds),
        supabase
          .from('devices')
          .select('business_id, status')
          .in('business_id', businessIds),
        supabase
          .from('menu_items')
          .select('business_id')
          .in('business_id', businessIds)
          .eq('is_active', true),
        supabase
          .from('kiosk_analytics_events')
          .select('business_id, created_at')
          .in('business_id', businessIds)
          .order('created_at', { ascending: false })
          .limit(1000),
      ])

      siteCountsByBusiness = (sitesResult.data || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.business_id] = (acc[row.business_id] || 0) + 1
        return acc
      }, {})

      deviceCountsByBusiness = (devicesResult.data || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.business_id] = (acc[row.business_id] || 0) + 1
        return acc
      }, {})

      onlineDeviceCountsByBusiness = (devicesResult.data || []).reduce((acc: Record<string, number>, row: any) => {
        if (row.status === 'online') {
          acc[row.business_id] = (acc[row.business_id] || 0) + 1
        }
        return acc
      }, {})

      offlineDeviceCountsByBusiness = (devicesResult.data || []).reduce((acc: Record<string, number>, row: any) => {
        if (row.status !== 'online') {
          acc[row.business_id] = (acc[row.business_id] || 0) + 1
        }
        return acc
      }, {})

      menuItemCountsByBusiness = (menuItemsResult.data || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.business_id] = (acc[row.business_id] || 0) + 1
        return acc
      }, {})

      for (const row of activityResult.data || []) {
        if (!lastActivityByBusiness[row.business_id]) {
          lastActivityByBusiness[row.business_id] = row.created_at
        }
      }
    }

    // Enrich with owner email from auth.users via admin API
    const enriched = await Promise.all((businesses || []).map(async (b: any) => {
      const ownerRow = b.user_businesses?.find((ub: any) => ub.role === 'owner')
      const subscription = b.settings?.subscription || {}
      const paymentMethod = subscription?.paymentMethod || {}
      let ownerEmail = ''
      let ownerName = ''
      if (ownerRow?.user_id) {
        const { data: userData } = await supabase.auth.admin.getUserById(ownerRow.user_id)
        ownerEmail = userData?.user?.email || ''
        ownerName = userData?.user?.user_metadata?.full_name || ''
      }
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        status: b.status,
        plan: b.plan_type,
        createdAt: b.created_at,
        trialEndsAt: b.trial_ends_at,
        contactEmail: ownerEmail,
        contactName: ownerName,
        phone: b.settings?.address?.phone || '',
        address: [b.settings?.address?.street, b.settings?.address?.city, b.settings?.address?.country].filter(Boolean).join(', '),
        subscriptionStatus: subscription?.status || (b.status === 'active' ? 'active' : b.status === 'trial' ? 'trial' : b.status),
        billingCycle: subscription?.billingCycle || null,
        nextBillingAt: subscription?.stripeCurrentPeriodEnd || null,
        paymentCardBrand: paymentMethod?.brand || null,
        paymentCardLast4: paymentMethod?.last4 || null,
        paymentCardExpMonth: paymentMethod?.expMonth || null,
        paymentCardExpYear: paymentMethod?.expYear || null,
        hasPaymentMethodOnFile: Boolean(subscription?.stripePaymentMethodId),
        paymentMethodUpdatedAt: subscription?.paymentMethodUpdatedAt || null,
        lastInvoiceStatus: subscription?.lastInvoiceStatus || null,
        revenue: getMonthlyRevenueForPlan(b.plan_type),
        setupMilestones: {
          sitesCount: siteCountsByBusiness[b.id] || 0,
          devicesCount: deviceCountsByBusiness[b.id] || 0,
          menuItemsCount: menuItemCountsByBusiness[b.id] || 0,
        },
        deviceStatus: {
          online: onlineDeviceCountsByBusiness[b.id] || 0,
          offline: offlineDeviceCountsByBusiness[b.id] || 0,
        },
        lastActivityAt: lastActivityByBusiness[b.id] || null,
      }
    }))

    return NextResponse.json({ businesses: enriched })
  } catch (err) {
    console.error('Super admin GET businesses error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      ownerName,
      ownerEmail,
      ownerPhone,
      businessName,
      businessDescription,
      businessAddress,
      businessCity,
      businessPostalCode,
      businessCountry,
      createFirstSite = true,
      siteName = 'Main Location',
      siteAddress,
      siteCity,
      sitePostalCode,
      siteCountry,
      plan,
      sendWelcomeEmail,
    } = body

    if (!ownerName || !ownerEmail || !businessName) {
      return NextResponse.json(
        { error: 'Owner name, email, and business name are required' },
        { status: 400 }
      )
    }

    if (plan && !isPlanKey(plan)) {
      return NextResponse.json(
        { error: 'Please select a valid plan before continuing' },
        { status: 400 }
      )
    }

    if (createFirstSite !== false && !String(siteName || '').trim()) {
      return NextResponse.json(
        { error: 'First site name is required when creating a first site' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Create the user account (email confirmed, with temp password)
    const { data: userData, error: userCreateError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: Math.random().toString(36).slice(-10) + 'Aa1!',
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        business_name: businessName
      }
    })

    if (userCreateError) {
      return NextResponse.json(
        { error: userCreateError.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    // 2. Create the business record
    const baseSlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const slug = `${baseSlug}-${Date.now().toString().slice(-6)}`

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: businessName,
        description: businessDescription || '',
        slug,
        status: 'active',
        plan_type: plan || 'starter',
        trial_started_at: null,
        trial_ends_at: null,
        subscription_started_at: new Date().toISOString(),
        pdf_download_count: 0,
        settings: {
          theme: { primaryColor: '#42b8ac', secondaryColor: '#003842' },
          address: {
            street: businessAddress || '',
            city: businessCity || '',
            postalCode: businessPostalCode || '',
            country: businessCountry || '',
            phone: ownerPhone || ''
          },
          subscription: { plan: plan || 'starter', status: 'active' }
        }
      })
      .select()
      .single()

    if (businessError) {
      console.error('Failed to create business record:', businessError)
      await supabase.auth.admin.deleteUser(userData.user.id)
      return NextResponse.json({ error: businessError.message || 'Failed to create business record' }, { status: 500 })
    }

    // 3. Link owner to business
    const { error: linkError } = await supabase
      .from('user_businesses')
      .insert({ user_id: userData.user.id, business_id: business.id, role: 'owner' })

    if (linkError) {
      console.error('Failed to link owner to business:', linkError)
      await supabase.auth.admin.deleteUser(userData.user.id)
      await supabase.from('businesses').delete().eq('id', business.id)
      return NextResponse.json({ error: linkError.message || 'Failed to link owner to business' }, { status: 500 })
    }

    // 4. Create the first site/location so onboarding can continue immediately
    let firstSite = null
    if (createFirstSite !== false) {
      const cleanSiteName = String(siteName || '').trim()
      const siteSlug = `${slugify(cleanSiteName)}-${Date.now().toString().slice(-6)}`
      const { data: createdSite, error: siteError } = await supabase
        .from('sites')
        .insert({
          business_id: business.id,
          name: cleanSiteName,
          slug: siteSlug,
          address: siteAddress || businessAddress || null,
          city: siteCity || businessCity || null,
          country: siteCountry || businessCountry || null,
          eircode: sitePostalCode || businessPostalCode || null,
          phone: ownerPhone || null,
          email: ownerEmail,
          is_active: true,
        })
        .select()
        .single()

      if (siteError) {
        console.error('Failed to create first site:', siteError)
        await supabase.from('user_businesses').delete().eq('business_id', business.id)
        await supabase.from('businesses').delete().eq('id', business.id)
        await supabase.auth.admin.deleteUser(userData.user.id)
        return NextResponse.json({ error: siteError.message || 'Failed to create first site' }, { status: 500 })
      }

      firstSite = createdSite
    }

    // 5. Send password reset / welcome email so the user can set their own password
    if (sendWelcomeEmail !== false) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(ownerEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://allyjen.ie'}/auth/update-password`
      })
      if (resetError) {
        console.warn('Password reset email failed (non-fatal):', resetError.message)
      }
    }

    return NextResponse.json({
      success: true,
      businessId: business.id,
      businessName: business.name,
      userId: userData.user.id,
      ownerEmail,
      firstSiteId: firstSite?.id || null,
      firstSiteName: firstSite?.name || null,
      message: `Business "${businessName}" created. A password setup email has been sent to ${ownerEmail}.`
    })
  } catch (err) {
    console.error('Super admin business creation error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
