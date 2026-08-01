import { getJwtSecret } from '@/lib/auth'
// app/api/business/data/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      console.error('❌ No auth token in cookies')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)

    const userId = payload.userId as string
    if (!userId) {
      console.error('❌ No userId in token')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()

    // Get user's business
    const { data: userBusiness, error: ubError } = await supabase
      .from('user_businesses')
      .select('business_id')
      .eq('user_id', userId)
      .single()

    if (ubError || !userBusiness) {
      console.error('❌ No business association found')
      return NextResponse.json(
        { error: 'No business found' },
        { status: 404 }
      )
    }

    const businessId = userBusiness.business_id

    // Fetch all data in parallel
    const [
      businessResult,
      sitesResult,
      menuItemsResult,
      ingredientsResult,
      suppliersResult
    ] = await Promise.all([
      supabase.from('businesses').select('id, name, settings').eq('id', businessId).single(),
      supabase.from('sites').select('id, name').eq('business_id', businessId).order('name'),
      supabase.from('menu_items').select('*').eq('business_id', businessId).eq('is_active', true),
      supabase.from('ingredients').select('*').eq('business_id', businessId),
      supabase.from('suppliers').select('*').eq('business_id', businessId)
    ])

    // Check for errors
    if (businessResult.error) {
      console.error('❌ Business query error:', businessResult.error)
      return NextResponse.json(
        { error: 'Failed to load business data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      business: businessResult.data,
      sites: sitesResult.data || [],
      menuItems: menuItemsResult.data || [],
      ingredients: ingredientsResult.data || [],
      suppliers: suppliersResult.data || []
    })

  } catch (error) {
    console.error('❌ Business data API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}