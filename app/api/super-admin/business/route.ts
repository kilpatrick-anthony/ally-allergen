// app/api/super-admin/business/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Check if user is super admin
    const { data: { user }, error: userError } = await createServiceClient().auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, check if user has admin email - in production you'd have proper roles
    const isSuperAdmin = user.email === 'admin@allyjen.com'
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

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
      createSampleData
    } = body

    if (!ownerName || !ownerEmail || !businessName) {
      return NextResponse.json(
        { error: 'Owner name, email, and business name are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Create the user account
    console.log('👤 Creating user account for:', ownerEmail)
    const { data: userData, error: userError2 } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: Math.random().toString(36).slice(-12) + 'Aa1!', // Generate temporary password
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        business_name: businessName
      }
    })

    if (userError2) {
      console.error('❌ User creation error:', userError2)
      return NextResponse.json(
        { error: userError2.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    // 2. Create the business
    const baseSlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const timestamp = Date.now().toString().slice(-6)
    const slug = `${baseSlug}-${timestamp}`

    const now = new Date()
    // No trial periods - businesses are created as active
    const trialEndsAt = null

    console.log('🏢 Creating business...')
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: businessName,
        description: businessDescription || '',
        slug: slug,
        status: 'active', // Always active, no trial status
        plan_type: plan,
        trial_started_at: null, // No trial
        trial_ends_at: null, // No trial
        subscription_started_at: now.toISOString(),
        pdf_download_count: 0,
        settings: {
          theme: {
            primaryColor: '#42b8ac',
            secondaryColor: '#003842'
          },
          address: {
            street: businessAddress || '',
            city: businessCity || '',
            postalCode: businessPostalCode || '',
            country: businessCountry || '',
            phone: ownerPhone || ''
          },
          subscription: {
            plan: plan,
            status: 'active'
          }
        }
      })
      .select()
      .single()

    if (businessError) {
      console.error('❌ Business creation error:', businessError)
      // Cleanup: delete the user
      await supabase.auth.admin.deleteUser(userData.user.id)
      return NextResponse.json(
        { error: 'Failed to create business' },
        { status: 500 }
      )
    }

    // 3. Create user-business association
    console.log('🔗 Creating user-business association...')
    const { error: userBusinessError } = await supabase
      .from('user_businesses')
      .insert({
        user_id: userData.user.id,
        business_id: business.id,
        role: 'owner'
      })

    if (userBusinessError) {
      console.error('❌ User-business association error:', userBusinessError)
      // Cleanup
      await supabase.auth.admin.deleteUser(userData.user.id)
      await supabase.from('businesses').delete().eq('id', business.id)
      return NextResponse.json(
        { error: 'Failed to associate user with business' },
        { status: 500 }
      )
    }

    // 4. Send welcome email if requested
    if (sendWelcomeEmail) {
      // In a real implementation, you'd send an email here
      console.log('📧 Would send welcome email to:', ownerEmail)
    }

    // 5. Create sample data if requested
    if (createSampleData) {
      // In a real implementation, you'd create sample ingredients and menu items
      console.log('📝 Would create sample data for business:', business.id)
    }

    console.log('✅ Business setup complete:', business.id)

    return NextResponse.json({
      success: true,
      businessId: business.id,
      userId: userData.user.id,
      message: `Business "${businessName}" created successfully`
    })
  } catch (err) {
    console.error('Super admin business creation error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}