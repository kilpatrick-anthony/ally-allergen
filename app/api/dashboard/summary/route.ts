import { getJwtSecret } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { payload } = await jwtVerify(authToken, getJwtSecret())
    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('business_id')
      .eq('user_id', userId)
      .single()

    if (!userBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const businessId = userBusiness.business_id
    const [ingredients, menuItems, datasheets, suppliers, sites] = await Promise.all([
      supabase.from('ingredients').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('datasheets').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'active'),
      supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('sites').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    ])

    const failedQuery = [ingredients, menuItems, datasheets, suppliers, sites].find(result => result.error)
    if (failedQuery?.error) {
      console.error('Error loading dashboard summary:', failedQuery.error)
      return NextResponse.json({ error: 'Failed to load dashboard summary' }, { status: 500 })
    }

    return NextResponse.json({
      stats: {
        ingredients: ingredients.count ?? 0,
        menuItems: menuItems.count ?? 0,
        datasheets: datasheets.count ?? 0,
        suppliers: suppliers.count ?? 0,
        sites: sites.count ?? 0,
      }
    })
  } catch (error: any) {
    console.error('Unexpected dashboard summary error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
