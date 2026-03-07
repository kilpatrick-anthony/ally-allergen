// app/api/business/create/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, businessName, businessDescription } = body

    if (!userId || !businessName) {
      return NextResponse.json(
        { error: 'User ID and business name are required' },
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS during signup
    const supabase = createServiceClient()

    // Create unique slug from business name with timestamp to avoid duplicates
    const baseSlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const timestamp = Date.now().toString().slice(-6)
    const slug = `${baseSlug}-${timestamp}`

    // Calculate trial end date (7 days from now)
    const now = new Date()
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // 1. Create the business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: businessName,
        description: businessDescription || '',
        slug: slug,
        status: 'active',
        plan_type: 'trial',
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        pdf_download_count: 0,
        settings: {
          theme: {
            primaryColor: '#42b8ac',
            secondaryColor: '#003842'
          }
        }
      })
      .select()
      .single()

    if (businessError) {
      console.error('Business creation error:', businessError)
      return NextResponse.json(
        { error: 'Failed to create business' },
        { status: 500 }
      )
    }

    // 2. Create user-business association
    const { error: userBusinessError } = await supabase
      .from('user_businesses')
      .insert({
        user_id: userId,
        business_id: business.id,
        role: 'owner'
      })

    if (userBusinessError) {
      console.error('User-business association error:', userBusinessError)
      
      // Cleanup: delete the business if association failed
      await supabase
        .from('businesses')
        .delete()
        .eq('id', business.id)
      
      return NextResponse.json(
        { error: 'Failed to associate user with business' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      businessId: business.id,
      businessName: business.name
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
