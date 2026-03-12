// app/api/super-admin/business/route.ts
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
    const userId = payload.userId as string
    const userEmail = payload.email as string

    const isSuperAdmin =
      userEmail === 'anthony@allyjen.ie'

    if (!isSuperAdmin) return null
    return { userId, userEmail }
  } catch {
    return null
  }
}

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

    // Enrich with owner email from auth.users via admin API
    const enriched = await Promise.all((businesses || []).map(async (b: any) => {
      const ownerRow = b.user_businesses?.find((ub: any) => ub.role === 'owner')
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
        subscriptionStatus: b.status === 'active' ? 'active' : b.status === 'trial' ? 'trial' : b.status,
        revenue: b.plan_type === 'starter' ? 99 : b.plan_type === 'pro' ? 299 : 499,
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
      plan,
      sendWelcomeEmail,
    } = body

    if (!ownerName || !ownerEmail || !businessName) {
      return NextResponse.json(
        { error: 'Owner name, email, and business name are required' },
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
      await supabase.auth.admin.deleteUser(userData.user.id)
      return NextResponse.json({ error: 'Failed to create business' }, { status: 500 })
    }

    // 3. Link owner to business
    const { error: linkError } = await supabase
      .from('user_businesses')
      .insert({ user_id: userData.user.id, business_id: business.id, role: 'owner' })

    if (linkError) {
      await supabase.auth.admin.deleteUser(userData.user.id)
      await supabase.from('businesses').delete().eq('id', business.id)
      return NextResponse.json({ error: 'Failed to link user to business' }, { status: 500 })
    }

    // 4. Send password reset / welcome email so the user can set their own password
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
      userId: userData.user.id,
      message: `Business "${businessName}" created. A password setup email has been sent to ${ownerEmail}.`
    })
  } catch (err) {
    console.error('Super admin business creation error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}